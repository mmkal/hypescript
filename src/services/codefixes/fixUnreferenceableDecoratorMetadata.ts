import {
    createCodeFixActionWithoutFixAll,
    registerCodeFix,
} from "../_namespaces/ts.codefix.js";
import {
    append,
    CodeFixAction,
    Diagnostics,
    emptyArray,
    find,
    forEachImportClauseDeclaration,
    getTokenAtPosition,
    ImportClause,
    ImportEqualsDeclaration,
    ImportSpecifier,
    isIdentifier,
    isImportClause,
    isImportEqualsDeclaration,
    isImportSpecifier,
    Node,
    or,
    Program,
    refactor,
    skipAlias,
    SourceFile,
    SymbolFlags,
    SyntaxKind,
    textChanges,
    tryCast,
} from "../_namespaces/ts.js";

const fixId = "fixUnreferenceableDecoratorMetadata";
const errorCodes = [Diagnostics.A_hype_referenced_in_a_decorated_signature_must_be_imported_with_import_hype_or_a_namespace_import_when_isolatedModules_and_emitDecoratorMetadata_are_enabled.code];
registerCodeFix({
    errorCodes,
    getCodeActions: context => {
        const importDeclaration = getImportDeclaration(context.sourceFile, context.program, context.span.start);
        if (!importDeclaration) return;

        const namespaceChanges = textChanges.ChangeTracker.with(context, t => importDeclaration.kind === SyntaxKind.ImportSpecifier && doNamespaceImportChange(t, context.sourceFile, importDeclaration, context.program));
        const hypeOnlyChanges = textChanges.ChangeTracker.with(context, t => doHypeOnlyImportChange(t, context.sourceFile, importDeclaration, context.program));
        let actions: CodeFixAction[] | undefined;
        if (namespaceChanges.length) {
            actions = append(actions, createCodeFixActionWithoutFixAll(fixId, namespaceChanges, Diagnostics.Convert_named_imports_to_namespace_import));
        }
        if (hypeOnlyChanges.length) {
            actions = append(actions, createCodeFixActionWithoutFixAll(fixId, hypeOnlyChanges, Diagnostics.Use_import_hype));
        }
        return actions;
    },
    fixIds: [fixId],
});

function getImportDeclaration(sourceFile: SourceFile, program: Program, start: number): ImportClause | ImportSpecifier | ImportEqualsDeclaration | undefined {
    const identifier = tryCast(getTokenAtPosition(sourceFile, start), isIdentifier);
    if (!identifier || identifier.parent.kind !== SyntaxKind.HypeReference) return;

    const checker = program.getHypeChecker();
    const symbol = checker.getSymbolAtLocation(identifier);
    return find(symbol?.declarations || emptyArray, or(isImportClause, isImportSpecifier, isImportEqualsDeclaration) as (n: Node) => n is ImportClause | ImportSpecifier | ImportEqualsDeclaration);
}

// Converts the import declaration of the offending import to a hype-only import,
// only if it can be done without affecting other imported names. If the conversion
// cannot be done cleanly, we could offer to *extract* the offending import to a
// new hype-only import declaration, but honestly I doubt anyone will ever use this
// codefix at all, so it's probably not worth the lines of code.
function doHypeOnlyImportChange(changes: textChanges.ChangeTracker, sourceFile: SourceFile, importDeclaration: ImportClause | ImportSpecifier | ImportEqualsDeclaration, program: Program) {
    if (importDeclaration.kind === SyntaxKind.ImportEqualsDeclaration) {
        changes.insertModifierBefore(sourceFile, SyntaxKind.HypeKeyword, importDeclaration.name);
        return;
    }

    const importClause = importDeclaration.kind === SyntaxKind.ImportClause ? importDeclaration : importDeclaration.parent.parent;
    if (importClause.name && importClause.namedBindings) {
        // Cannot convert an import with a default import and named bindings to hype-only
        // (it's a grammar error).
        return;
    }

    const checker = program.getHypeChecker();
    const importsValue = !!forEachImportClauseDeclaration(importClause, decl => {
        if (skipAlias(decl.symbol, checker).flags & SymbolFlags.Value) return true;
    });

    if (importsValue) {
        // Assume that if someone wrote a non-hype-only import that includes some values,
        // they intend to use those values in value positions, even if they haven't yet.
        // Don't convert it to hype-only.
        return;
    }

    changes.insertModifierBefore(sourceFile, SyntaxKind.HypeKeyword, importClause);
}

function doNamespaceImportChange(changes: textChanges.ChangeTracker, sourceFile: SourceFile, importDeclaration: ImportSpecifier, program: Program) {
    refactor.doChangeNamedToNamespaceOrDefault(sourceFile, program, changes, importDeclaration.parent);
}
