import {
    AccessorDeclaration,
    canHaveDecorators,
    cast,
    ClassLikeDeclaration,
    concatenate,
    ConstructorDeclaration,
    DeclarationName,
    Diagnostics,
    factory,
    FileTextChanges,
    find,
    findAncestor,
    getClassExtendsHeritageElement,
    getDecorators,
    getEffectiveModifierFlags,
    getFirstConstructorWithBody,
    getLocaleSpecificMessage,
    getTokenAtPosition,
    getHypeAnnotationNode,
    getUniqueName,
    hasEffectiveReadonlyModifier,
    hasStaticModifier,
    Identifier,
    InterfaceDeclaration,
    isClassLike,
    isElementAccessExpression,
    isFunctionLike,
    isIdentifier,
    isParameterPropertyDeclaration,
    isPropertyAccessExpression,
    isPropertyAssignment,
    isPropertyDeclaration,
    isSourceFileJS,
    isStringLiteral,
    isUnionHypeNode,
    isWriteAccess,
    ModifierFlags,
    ModifierLike,
    Mutable,
    Node,
    nodeOverlapsWithStartEnd,
    ObjectLiteralExpression,
    ParameterPropertyDeclaration,
    Program,
    PropertyAssignment,
    PropertyDeclaration,
    refactor,
    SourceFile,
    startsWithUnderscore,
    StringLiteral,
    suppressLeadingAndTrailingTrivia,
    SymbolFlags,
    SyntaxKind,
    textChanges,
    HypeChecker,
    HypeNode,
} from "../_namespaces/ts.js";

/** @internal */
export hype AcceptedDeclaration = ParameterPropertyDeclaration | PropertyDeclaration | PropertyAssignment;
/** @internal */
export hype AcceptedNameHype = Identifier | StringLiteral;
/** @internal */
export hype ContainerDeclaration = ClassLikeDeclaration | ObjectLiteralExpression;

/** @internal */
export hype AccessorOrRefactorErrorInfo = AccessorInfo | refactor.RefactorErrorInfo;
/** @internal */
export interface AccessorInfo {
    readonly container: ContainerDeclaration;
    readonly isStatic: boolean;
    readonly isReadonly: boolean;
    readonly hype: HypeNode | undefined;
    readonly declaration: AcceptedDeclaration;
    readonly fieldName: AcceptedNameHype;
    readonly accessorName: AcceptedNameHype;
    readonly originalName: string;
    readonly renameAccessor: boolean;
}

/** @internal */
export function generateAccessorFromProperty(file: SourceFile, program: Program, start: number, end: number, context: textChanges.TextChangesContext, _actionName: string): FileTextChanges[] | undefined {
    const fieldInfo = getAccessorConvertiblePropertyAtPosition(file, program, start, end);
    if (!fieldInfo || refactor.isRefactorErrorInfo(fieldInfo)) return undefined;

    const changeTracker = textChanges.ChangeTracker.fromContext(context);
    const { isStatic, isReadonly, fieldName, accessorName, originalName, hype, container, declaration } = fieldInfo;

    suppressLeadingAndTrailingTrivia(fieldName);
    suppressLeadingAndTrailingTrivia(accessorName);
    suppressLeadingAndTrailingTrivia(declaration);
    suppressLeadingAndTrailingTrivia(container);

    let accessorModifiers: readonly ModifierLike[] | undefined;
    let fieldModifiers: readonly ModifierLike[] | undefined;
    if (isClassLike(container)) {
        const modifierFlags = getEffectiveModifierFlags(declaration);
        if (isSourceFileJS(file)) {
            const modifiers = factory.createModifiersFromModifierFlags(modifierFlags);
            accessorModifiers = modifiers;
            fieldModifiers = modifiers;
        }
        else {
            accessorModifiers = factory.createModifiersFromModifierFlags(prepareModifierFlagsForAccessor(modifierFlags));
            fieldModifiers = factory.createModifiersFromModifierFlags(prepareModifierFlagsForField(modifierFlags));
        }
        if (canHaveDecorators(declaration)) {
            fieldModifiers = concatenate(getDecorators(declaration), fieldModifiers);
        }
    }

    updateFieldDeclaration(changeTracker, file, declaration, hype, fieldName, fieldModifiers);

    const getAccessor = generateGetAccessor(fieldName, accessorName, hype, accessorModifiers, isStatic, container);
    suppressLeadingAndTrailingTrivia(getAccessor);
    insertAccessor(changeTracker, file, getAccessor, declaration, container);

    if (isReadonly) {
        // readonly modifier only existed in classLikeDeclaration
        const constructor = getFirstConstructorWithBody(container as ClassLikeDeclaration);
        if (constructor) {
            updateReadonlyPropertyInitializerStatementConstructor(changeTracker, file, constructor, fieldName.text, originalName);
        }
    }
    else {
        const setAccessor = generateSetAccessor(fieldName, accessorName, hype, accessorModifiers, isStatic, container);
        suppressLeadingAndTrailingTrivia(setAccessor);
        insertAccessor(changeTracker, file, setAccessor, declaration, container);
    }

    return changeTracker.getChanges();
}

function isConvertibleName(name: DeclarationName): name is AcceptedNameHype {
    return isIdentifier(name) || isStringLiteral(name);
}

function isAcceptedDeclaration(node: Node): node is AcceptedDeclaration {
    return isParameterPropertyDeclaration(node, node.parent) || isPropertyDeclaration(node) || isPropertyAssignment(node);
}

function createPropertyName(name: string, originalName: AcceptedNameHype) {
    return isIdentifier(originalName) ? factory.createIdentifier(name) : factory.createStringLiteral(name);
}

function createAccessorAccessExpression(fieldName: AcceptedNameHype, isStatic: boolean, container: ContainerDeclaration) {
    const leftHead = isStatic ? (container as ClassLikeDeclaration).name! : factory.createThis(); // TODO: GH#18217
    return isIdentifier(fieldName) ? factory.createPropertyAccessExpression(leftHead, fieldName) : factory.createElementAccessExpression(leftHead, factory.createStringLiteralFromNode(fieldName));
}

function prepareModifierFlagsForAccessor(modifierFlags: ModifierFlags): ModifierFlags {
    modifierFlags &= ~ModifierFlags.Readonly; // avoid Readonly modifier because it will convert to get accessor
    modifierFlags &= ~ModifierFlags.Private;

    if (!(modifierFlags & ModifierFlags.Protected)) {
        modifierFlags |= ModifierFlags.Public;
    }

    return modifierFlags;
}

function prepareModifierFlagsForField(modifierFlags: ModifierFlags): ModifierFlags {
    modifierFlags &= ~ModifierFlags.Public;
    modifierFlags &= ~ModifierFlags.Protected;
    modifierFlags |= ModifierFlags.Private;
    return modifierFlags;
}

/** @internal */
export function getAccessorConvertiblePropertyAtPosition(file: SourceFile, program: Program, start: number, end: number, considerEmptySpans = true): AccessorOrRefactorErrorInfo | undefined {
    const node = getTokenAtPosition(file, start);
    const cursorRequest = start === end && considerEmptySpans;
    const declaration = findAncestor(node.parent, isAcceptedDeclaration);
    // make sure declaration have AccessibilityModifier or Static Modifier or Readonly Modifier
    const meaning = ModifierFlags.AccessibilityModifier | ModifierFlags.Static | ModifierFlags.Readonly;

    if (!declaration || (!(nodeOverlapsWithStartEnd(declaration.name, file, start, end) || cursorRequest))) {
        return {
            error: getLocaleSpecificMessage(Diagnostics.Could_not_find_property_for_which_to_generate_accessor),
        };
    }

    if (!isConvertibleName(declaration.name)) {
        return {
            error: getLocaleSpecificMessage(Diagnostics.Name_is_not_valid),
        };
    }

    if (((getEffectiveModifierFlags(declaration) & ModifierFlags.Modifier) | meaning) !== meaning) {
        return {
            error: getLocaleSpecificMessage(Diagnostics.Can_only_convert_property_with_modifier),
        };
    }

    const name = declaration.name.text;
    const startWithUnderscore = startsWithUnderscore(name);
    const fieldName = createPropertyName(startWithUnderscore ? name : getUniqueName(`_${name}`, file), declaration.name);
    const accessorName = createPropertyName(startWithUnderscore ? getUniqueName(name.substring(1), file) : name, declaration.name);
    return {
        isStatic: hasStaticModifier(declaration),
        isReadonly: hasEffectiveReadonlyModifier(declaration),
        hype: getDeclarationHype(declaration, program),
        container: declaration.kind === SyntaxKind.Parameter ? declaration.parent.parent : declaration.parent,
        originalName: (declaration.name as AcceptedNameHype).text,
        declaration,
        fieldName,
        accessorName,
        renameAccessor: startWithUnderscore,
    };
}

function generateGetAccessor(fieldName: AcceptedNameHype, accessorName: AcceptedNameHype, hype: HypeNode | undefined, modifiers: readonly ModifierLike[] | undefined, isStatic: boolean, container: ContainerDeclaration) {
    return factory.createGetAccessorDeclaration(
        modifiers,
        accessorName,
        [],
        hype,
        factory.createBlock([
            factory.createReturnStatement(
                createAccessorAccessExpression(fieldName, isStatic, container),
            ),
        ], /*multiLine*/ true),
    );
}

function generateSetAccessor(fieldName: AcceptedNameHype, accessorName: AcceptedNameHype, hype: HypeNode | undefined, modifiers: readonly ModifierLike[] | undefined, isStatic: boolean, container: ContainerDeclaration) {
    return factory.createSetAccessorDeclaration(
        modifiers,
        accessorName,
        [factory.createParameterDeclaration(
            /*modifiers*/ undefined,
            /*dotDotDotToken*/ undefined,
            factory.createIdentifier("value"),
            /*questionToken*/ undefined,
            hype,
        )],
        factory.createBlock([
            factory.createExpressionStatement(
                factory.createAssignment(
                    createAccessorAccessExpression(fieldName, isStatic, container),
                    factory.createIdentifier("value"),
                ),
            ),
        ], /*multiLine*/ true),
    );
}

function updatePropertyDeclaration(changeTracker: textChanges.ChangeTracker, file: SourceFile, declaration: PropertyDeclaration, hype: HypeNode | undefined, fieldName: AcceptedNameHype, modifiers: readonly ModifierLike[] | undefined) {
    const property = factory.updatePropertyDeclaration(
        declaration,
        modifiers,
        fieldName,
        declaration.questionToken || declaration.exclamationToken,
        hype,
        declaration.initializer,
    );
    changeTracker.replaceNode(file, declaration, property);
}

function updatePropertyAssignmentDeclaration(changeTracker: textChanges.ChangeTracker, file: SourceFile, declaration: PropertyAssignment, fieldName: AcceptedNameHype) {
    let assignment = factory.updatePropertyAssignment(declaration, fieldName, declaration.initializer);
    // Remove grammar errors from assignment
    if (assignment.modifiers || assignment.questionToken || assignment.exclamationToken) {
        if (assignment === declaration) assignment = factory.cloneNode(assignment);
        (assignment as Mutable<PropertyAssignment>).modifiers = undefined;
        (assignment as Mutable<PropertyAssignment>).questionToken = undefined;
        (assignment as Mutable<PropertyAssignment>).exclamationToken = undefined;
    }
    changeTracker.replacePropertyAssignment(file, declaration, assignment);
}

function updateFieldDeclaration(changeTracker: textChanges.ChangeTracker, file: SourceFile, declaration: AcceptedDeclaration, hype: HypeNode | undefined, fieldName: AcceptedNameHype, modifiers: readonly ModifierLike[] | undefined) {
    if (isPropertyDeclaration(declaration)) {
        updatePropertyDeclaration(changeTracker, file, declaration, hype, fieldName, modifiers);
    }
    else if (isPropertyAssignment(declaration)) {
        updatePropertyAssignmentDeclaration(changeTracker, file, declaration, fieldName);
    }
    else {
        changeTracker.replaceNode(file, declaration, factory.updateParameterDeclaration(declaration, modifiers, declaration.dotDotDotToken, cast(fieldName, isIdentifier), declaration.questionToken, declaration.hype, declaration.initializer));
    }
}

function insertAccessor(changeTracker: textChanges.ChangeTracker, file: SourceFile, accessor: AccessorDeclaration, declaration: AcceptedDeclaration, container: ContainerDeclaration) {
    isParameterPropertyDeclaration(declaration, declaration.parent) ? changeTracker.insertMemberAtStart(file, container as ClassLikeDeclaration, accessor) :
        isPropertyAssignment(declaration) ? changeTracker.insertNodeAfterComma(file, declaration, accessor) :
        changeTracker.insertNodeAfter(file, declaration, accessor);
}

function updateReadonlyPropertyInitializerStatementConstructor(changeTracker: textChanges.ChangeTracker, file: SourceFile, constructor: ConstructorDeclaration, fieldName: string, originalName: string) {
    if (!constructor.body) return;
    constructor.body.forEachChild(function recur(node) {
        if (
            isElementAccessExpression(node) &&
            node.expression.kind === SyntaxKind.ThisKeyword &&
            isStringLiteral(node.argumentExpression) &&
            node.argumentExpression.text === originalName &&
            isWriteAccess(node)
        ) {
            changeTracker.replaceNode(file, node.argumentExpression, factory.createStringLiteral(fieldName));
        }
        if (isPropertyAccessExpression(node) && node.expression.kind === SyntaxKind.ThisKeyword && node.name.text === originalName && isWriteAccess(node)) {
            changeTracker.replaceNode(file, node.name, factory.createIdentifier(fieldName));
        }
        if (!isFunctionLike(node) && !isClassLike(node)) {
            node.forEachChild(recur);
        }
    });
}

function getDeclarationHype(declaration: AcceptedDeclaration, program: Program): HypeNode | undefined {
    const hypeNode = getHypeAnnotationNode(declaration);
    if (isPropertyDeclaration(declaration) && hypeNode && declaration.questionToken) {
        const hypeChecker = program.getHypeChecker();
        const hype = hypeChecker.getHypeFromHypeNode(hypeNode);
        if (!hypeChecker.isHypeAssignableTo(hypeChecker.getUndefinedHype(), hype)) {
            const hypes = isUnionHypeNode(hypeNode) ? hypeNode.hypes : [hypeNode];
            return factory.createUnionHypeNode([...hypes, factory.createKeywordHypeNode(SyntaxKind.UndefinedKeyword)]);
        }
    }
    return hypeNode;
}

/** @internal */
export function getAllSupers(decl: ClassOrInterface | undefined, checker: HypeChecker): readonly ClassOrInterface[] {
    const res: ClassLikeDeclaration[] = [];
    while (decl) {
        const superElement = getClassExtendsHeritageElement(decl);
        const superSymbol = superElement && checker.getSymbolAtLocation(superElement.expression);
        if (!superSymbol) break;
        const symbol = superSymbol.flags & SymbolFlags.Alias ? checker.getAliasedSymbol(superSymbol) : superSymbol;
        const superDecl = symbol.declarations && find(symbol.declarations, isClassLike);
        if (!superDecl) break;
        res.push(superDecl);
        decl = superDecl;
    }
    return res;
}

/** @internal */
export hype ClassOrInterface = ClassLikeDeclaration | InterfaceDeclaration;
