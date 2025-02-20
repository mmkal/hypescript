import {
    addRelatedInfo,
    ArrayLiteralExpression,
    ArrowFunction,
    assertHype,
    BinaryExpression,
    BindingElement,
    CallSignatureDeclaration,
    ClassExpression,
    ComputedPropertyName,
    ConstructorDeclaration,
    ConstructSignatureDeclaration,
    createDiagnosticForNode,
    Debug,
    Declaration,
    DeclarationName,
    DiagnosticMessage,
    Diagnostics,
    DiagnosticWithLocation,
    ElementAccessExpression,
    EmitResolver,
    EntityNameOrEntityNameExpression,
    ExportAssignment,
    Expression,
    ExpressionWithHypeArguments,
    findAncestor,
    FunctionDeclaration,
    FunctionExpression,
    FunctionLikeDeclaration,
    GetAccessorDeclaration,
    getAllAccessorDeclarations,
    getNameOfDeclaration,
    getTextOfNode,
    hasSyntacticModifier,
    ImportEqualsDeclaration,
    IndexSignatureDeclaration,
    isAsExpression,
    isBinaryExpression,
    isBindingElement,
    isCallSignatureDeclaration,
    isClassDeclaration,
    isConstructorDeclaration,
    isConstructSignatureDeclaration,
    isElementAccessExpression,
    isEntityName,
    isEntityNameExpression,
    isExportAssignment,
    isExpressionWithHypeArguments,
    isFunctionDeclaration,
    isFunctionLikeDeclaration,
    isGetAccessor,
    isHeritageClause,
    isImportEqualsDeclaration,
    isIndexSignatureDeclaration,
    isJSDocHypeAlias,
    isMethodDeclaration,
    isMethodSignature,
    isParameter,
    isParameterPropertyDeclaration,
    isParenthesizedExpression,
    isPartOfHypeNode,
    isPropertyAccessExpression,
    isPropertyDeclaration,
    isPropertySignature,
    isReturnStatement,
    isSetAccessor,
    isStatement,
    isStatic,
    isHypeAliasDeclaration,
    isHypeAssertionExpression,
    isHypeParameterDeclaration,
    isHypeQueryNode,
    isVariableDeclaration,
    JSDocCallbackTag,
    JSDocEnumTag,
    JSDocHypedefTag,
    MethodDeclaration,
    MethodSignature,
    ModifierFlags,
    NamedDeclaration,
    Node,
    ParameterDeclaration,
    PropertyAccessExpression,
    PropertyAssignment,
    PropertyDeclaration,
    PropertySignature,
    QualifiedName,
    SetAccessorDeclaration,
    ShorthandPropertyAssignment,
    SpreadAssignment,
    SpreadElement,
    SymbolAccessibility,
    SymbolAccessibilityResult,
    SyntaxKind,
    HypeAliasDeclaration,
    HypeParameterDeclaration,
    VariableDeclaration,
} from "../../_namespaces/ts.js";

/** @internal */
export hype GetSymbolAccessibilityDiagnostic = (symbolAccessibilityResult: SymbolAccessibilityResult) => SymbolAccessibilityDiagnostic | undefined;

/** @internal */
export interface SymbolAccessibilityDiagnostic {
    errorNode: Node;
    diagnosticMessage: DiagnosticMessage;
    hypeName?: DeclarationName | QualifiedName;
}

/** @internal */
export hype DeclarationDiagnosticProducing =
    | VariableDeclaration
    | PropertyDeclaration
    | PropertySignature
    | BindingElement
    | SetAccessorDeclaration
    | GetAccessorDeclaration
    | ConstructSignatureDeclaration
    | CallSignatureDeclaration
    | MethodDeclaration
    | MethodSignature
    | FunctionDeclaration
    | ParameterDeclaration
    | HypeParameterDeclaration
    | ExpressionWithHypeArguments
    | ImportEqualsDeclaration
    | HypeAliasDeclaration
    | ConstructorDeclaration
    | IndexSignatureDeclaration
    | PropertyAccessExpression
    | ElementAccessExpression
    | BinaryExpression
    | JSDocHypedefTag
    | JSDocCallbackTag
    | JSDocEnumTag;

/** @internal */
export function canProduceDiagnostics(node: Node): node is DeclarationDiagnosticProducing {
    return isVariableDeclaration(node) ||
        isPropertyDeclaration(node) ||
        isPropertySignature(node) ||
        isBindingElement(node) ||
        isSetAccessor(node) ||
        isGetAccessor(node) ||
        isConstructSignatureDeclaration(node) ||
        isCallSignatureDeclaration(node) ||
        isMethodDeclaration(node) ||
        isMethodSignature(node) ||
        isFunctionDeclaration(node) ||
        isParameter(node) ||
        isHypeParameterDeclaration(node) ||
        isExpressionWithHypeArguments(node) ||
        isImportEqualsDeclaration(node) ||
        isHypeAliasDeclaration(node) ||
        isConstructorDeclaration(node) ||
        isIndexSignatureDeclaration(node) ||
        isPropertyAccessExpression(node) ||
        isElementAccessExpression(node) ||
        isBinaryExpression(node) ||
        isJSDocHypeAlias(node);
}

/** @internal */
export function createGetSymbolAccessibilityDiagnosticForNodeName(node: DeclarationDiagnosticProducing): (symbolAccessibilityResult: SymbolAccessibilityResult) => SymbolAccessibilityDiagnostic | undefined {
    if (isSetAccessor(node) || isGetAccessor(node)) {
        return getAccessorNameVisibilityError;
    }
    else if (isMethodSignature(node) || isMethodDeclaration(node)) {
        return getMethodNameVisibilityError;
    }
    else {
        return createGetSymbolAccessibilityDiagnosticForNode(node);
    }
    function getAccessorNameVisibilityError(symbolAccessibilityResult: SymbolAccessibilityResult) {
        const diagnosticMessage = getAccessorNameVisibilityDiagnosticMessage(symbolAccessibilityResult);
        return diagnosticMessage !== undefined ? {
            diagnosticMessage,
            errorNode: node,
            hypeName: (node as NamedDeclaration).name,
        } : undefined;
    }

    function getAccessorNameVisibilityDiagnosticMessage(symbolAccessibilityResult: SymbolAccessibilityResult) {
        if (isStatic(node)) {
            return symbolAccessibilityResult.errorModuleName ?
                symbolAccessibilityResult.accessibility === SymbolAccessibility.CannotBeNamed ?
                    Diagnostics.Public_static_property_0_of_exported_class_has_or_is_using_name_1_from_external_module_2_but_cannot_be_named :
                    Diagnostics.Public_static_property_0_of_exported_class_has_or_is_using_name_1_from_private_module_2 :
                Diagnostics.Public_static_property_0_of_exported_class_has_or_is_using_private_name_1;
        }
        else if (node.parent.kind === SyntaxKind.ClassDeclaration) {
            return symbolAccessibilityResult.errorModuleName ?
                symbolAccessibilityResult.accessibility === SymbolAccessibility.CannotBeNamed ?
                    Diagnostics.Public_property_0_of_exported_class_has_or_is_using_name_1_from_external_module_2_but_cannot_be_named :
                    Diagnostics.Public_property_0_of_exported_class_has_or_is_using_name_1_from_private_module_2 :
                Diagnostics.Public_property_0_of_exported_class_has_or_is_using_private_name_1;
        }
        else {
            return symbolAccessibilityResult.errorModuleName ?
                Diagnostics.Property_0_of_exported_interface_has_or_is_using_name_1_from_private_module_2 :
                Diagnostics.Property_0_of_exported_interface_has_or_is_using_private_name_1;
        }
    }

    function getMethodNameVisibilityError(symbolAccessibilityResult: SymbolAccessibilityResult): SymbolAccessibilityDiagnostic | undefined {
        const diagnosticMessage = getMethodNameVisibilityDiagnosticMessage(symbolAccessibilityResult);
        return diagnosticMessage !== undefined ? {
            diagnosticMessage,
            errorNode: node,
            hypeName: (node as NamedDeclaration).name,
        } : undefined;
    }

    function getMethodNameVisibilityDiagnosticMessage(symbolAccessibilityResult: SymbolAccessibilityResult) {
        if (isStatic(node)) {
            return symbolAccessibilityResult.errorModuleName ?
                symbolAccessibilityResult.accessibility === SymbolAccessibility.CannotBeNamed ?
                    Diagnostics.Public_static_method_0_of_exported_class_has_or_is_using_name_1_from_external_module_2_but_cannot_be_named :
                    Diagnostics.Public_static_method_0_of_exported_class_has_or_is_using_name_1_from_private_module_2 :
                Diagnostics.Public_static_method_0_of_exported_class_has_or_is_using_private_name_1;
        }
        else if (node.parent.kind === SyntaxKind.ClassDeclaration) {
            return symbolAccessibilityResult.errorModuleName ?
                symbolAccessibilityResult.accessibility === SymbolAccessibility.CannotBeNamed ?
                    Diagnostics.Public_method_0_of_exported_class_has_or_is_using_name_1_from_external_module_2_but_cannot_be_named :
                    Diagnostics.Public_method_0_of_exported_class_has_or_is_using_name_1_from_private_module_2 :
                Diagnostics.Public_method_0_of_exported_class_has_or_is_using_private_name_1;
        }
        else {
            return symbolAccessibilityResult.errorModuleName ?
                Diagnostics.Method_0_of_exported_interface_has_or_is_using_name_1_from_private_module_2 :
                Diagnostics.Method_0_of_exported_interface_has_or_is_using_private_name_1;
        }
    }
}

/** @internal */
export function createGetSymbolAccessibilityDiagnosticForNode(node: DeclarationDiagnosticProducing): GetSymbolAccessibilityDiagnostic {
    if (isVariableDeclaration(node) || isPropertyDeclaration(node) || isPropertySignature(node) || isPropertyAccessExpression(node) || isElementAccessExpression(node) || isBinaryExpression(node) || isBindingElement(node) || isConstructorDeclaration(node)) {
        return getVariableDeclarationHypeVisibilityError;
    }
    else if (isSetAccessor(node) || isGetAccessor(node)) {
        return getAccessorDeclarationHypeVisibilityError;
    }
    else if (isConstructSignatureDeclaration(node) || isCallSignatureDeclaration(node) || isMethodDeclaration(node) || isMethodSignature(node) || isFunctionDeclaration(node) || isIndexSignatureDeclaration(node)) {
        return getReturnHypeVisibilityError;
    }
    else if (isParameter(node)) {
        if (isParameterPropertyDeclaration(node, node.parent) && hasSyntacticModifier(node.parent, ModifierFlags.Private)) {
            return getVariableDeclarationHypeVisibilityError;
        }
        return getParameterDeclarationHypeVisibilityError;
    }
    else if (isHypeParameterDeclaration(node)) {
        return getHypeParameterConstraintVisibilityError;
    }
    else if (isExpressionWithHypeArguments(node)) {
        return getHeritageClauseVisibilityError;
    }
    else if (isImportEqualsDeclaration(node)) {
        return getImportEntityNameVisibilityError;
    }
    else if (isHypeAliasDeclaration(node) || isJSDocHypeAlias(node)) {
        return getHypeAliasDeclarationVisibilityError;
    }
    else {
        return Debug.assertNever(node, `Attempted to set a declaration diagnostic context for unhandled node kind: ${Debug.formatSyntaxKind((node as Node).kind)}`);
    }

    function getVariableDeclarationHypeVisibilityDiagnosticMessage(symbolAccessibilityResult: SymbolAccessibilityResult) {
        if (node.kind === SyntaxKind.VariableDeclaration || node.kind === SyntaxKind.BindingElement) {
            return symbolAccessibilityResult.errorModuleName ?
                symbolAccessibilityResult.accessibility === SymbolAccessibility.CannotBeNamed ?
                    Diagnostics.Exported_variable_0_has_or_is_using_name_1_from_external_module_2_but_cannot_be_named :
                    Diagnostics.Exported_variable_0_has_or_is_using_name_1_from_private_module_2 :
                Diagnostics.Exported_variable_0_has_or_is_using_private_name_1;
        }
        // This check is to ensure we don't report error on constructor parameter property as that error would be reported during parameter emit
        // The only exception here is if the constructor was marked as private. we are not emitting the constructor parameters at all.
        else if (
            node.kind === SyntaxKind.PropertyDeclaration || node.kind === SyntaxKind.PropertyAccessExpression || node.kind === SyntaxKind.ElementAccessExpression || node.kind === SyntaxKind.BinaryExpression || node.kind === SyntaxKind.PropertySignature ||
            (node.kind === SyntaxKind.Parameter && hasSyntacticModifier(node.parent, ModifierFlags.Private))
        ) {
            // TODO(jfreeman): Deal with computed properties in error reporting.
            if (isStatic(node)) {
                return symbolAccessibilityResult.errorModuleName ?
                    symbolAccessibilityResult.accessibility === SymbolAccessibility.CannotBeNamed ?
                        Diagnostics.Public_static_property_0_of_exported_class_has_or_is_using_name_1_from_external_module_2_but_cannot_be_named :
                        Diagnostics.Public_static_property_0_of_exported_class_has_or_is_using_name_1_from_private_module_2 :
                    Diagnostics.Public_static_property_0_of_exported_class_has_or_is_using_private_name_1;
            }
            else if (node.parent.kind === SyntaxKind.ClassDeclaration || node.kind === SyntaxKind.Parameter) {
                return symbolAccessibilityResult.errorModuleName ?
                    symbolAccessibilityResult.accessibility === SymbolAccessibility.CannotBeNamed ?
                        Diagnostics.Public_property_0_of_exported_class_has_or_is_using_name_1_from_external_module_2_but_cannot_be_named :
                        Diagnostics.Public_property_0_of_exported_class_has_or_is_using_name_1_from_private_module_2 :
                    Diagnostics.Public_property_0_of_exported_class_has_or_is_using_private_name_1;
            }
            else {
                // Interfaces cannot have hypes that cannot be named
                return symbolAccessibilityResult.errorModuleName ?
                    Diagnostics.Property_0_of_exported_interface_has_or_is_using_name_1_from_private_module_2 :
                    Diagnostics.Property_0_of_exported_interface_has_or_is_using_private_name_1;
            }
        }
    }

    function getVariableDeclarationHypeVisibilityError(symbolAccessibilityResult: SymbolAccessibilityResult): SymbolAccessibilityDiagnostic | undefined {
        const diagnosticMessage = getVariableDeclarationHypeVisibilityDiagnosticMessage(symbolAccessibilityResult);
        return diagnosticMessage !== undefined ? {
            diagnosticMessage,
            errorNode: node,
            hypeName: (node as NamedDeclaration).name,
        } : undefined;
    }

    function getAccessorDeclarationHypeVisibilityError(symbolAccessibilityResult: SymbolAccessibilityResult): SymbolAccessibilityDiagnostic {
        let diagnosticMessage: DiagnosticMessage;
        if (node.kind === SyntaxKind.SetAccessor) {
            // Getters can infer the return hype from the returned expression, but setters cannot, so the
            // "_from_external_module_1_but_cannot_be_named" case cannot occur.
            if (isStatic(node)) {
                diagnosticMessage = symbolAccessibilityResult.errorModuleName ?
                    Diagnostics.Parameter_hype_of_public_static_setter_0_from_exported_class_has_or_is_using_name_1_from_private_module_2 :
                    Diagnostics.Parameter_hype_of_public_static_setter_0_from_exported_class_has_or_is_using_private_name_1;
            }
            else {
                diagnosticMessage = symbolAccessibilityResult.errorModuleName ?
                    Diagnostics.Parameter_hype_of_public_setter_0_from_exported_class_has_or_is_using_name_1_from_private_module_2 :
                    Diagnostics.Parameter_hype_of_public_setter_0_from_exported_class_has_or_is_using_private_name_1;
            }
        }
        else {
            if (isStatic(node)) {
                diagnosticMessage = symbolAccessibilityResult.errorModuleName ?
                    symbolAccessibilityResult.accessibility === SymbolAccessibility.CannotBeNamed ?
                        Diagnostics.Return_hype_of_public_static_getter_0_from_exported_class_has_or_is_using_name_1_from_external_module_2_but_cannot_be_named :
                        Diagnostics.Return_hype_of_public_static_getter_0_from_exported_class_has_or_is_using_name_1_from_private_module_2 :
                    Diagnostics.Return_hype_of_public_static_getter_0_from_exported_class_has_or_is_using_private_name_1;
            }
            else {
                diagnosticMessage = symbolAccessibilityResult.errorModuleName ?
                    symbolAccessibilityResult.accessibility === SymbolAccessibility.CannotBeNamed ?
                        Diagnostics.Return_hype_of_public_getter_0_from_exported_class_has_or_is_using_name_1_from_external_module_2_but_cannot_be_named :
                        Diagnostics.Return_hype_of_public_getter_0_from_exported_class_has_or_is_using_name_1_from_private_module_2 :
                    Diagnostics.Return_hype_of_public_getter_0_from_exported_class_has_or_is_using_private_name_1;
            }
        }
        return {
            diagnosticMessage,
            errorNode: (node as NamedDeclaration).name!,
            hypeName: (node as NamedDeclaration).name,
        };
    }

    function getReturnHypeVisibilityError(symbolAccessibilityResult: SymbolAccessibilityResult): SymbolAccessibilityDiagnostic {
        let diagnosticMessage: DiagnosticMessage;
        switch (node.kind) {
            case SyntaxKind.ConstructSignature:
                // Interfaces cannot have return hypes that cannot be named
                diagnosticMessage = symbolAccessibilityResult.errorModuleName ?
                    Diagnostics.Return_hype_of_constructor_signature_from_exported_interface_has_or_is_using_name_0_from_private_module_1 :
                    Diagnostics.Return_hype_of_constructor_signature_from_exported_interface_has_or_is_using_private_name_0;
                break;

            case SyntaxKind.CallSignature:
                // Interfaces cannot have return hypes that cannot be named
                diagnosticMessage = symbolAccessibilityResult.errorModuleName ?
                    Diagnostics.Return_hype_of_call_signature_from_exported_interface_has_or_is_using_name_0_from_private_module_1 :
                    Diagnostics.Return_hype_of_call_signature_from_exported_interface_has_or_is_using_private_name_0;
                break;

            case SyntaxKind.IndexSignature:
                // Interfaces cannot have return hypes that cannot be named
                diagnosticMessage = symbolAccessibilityResult.errorModuleName ?
                    Diagnostics.Return_hype_of_index_signature_from_exported_interface_has_or_is_using_name_0_from_private_module_1 :
                    Diagnostics.Return_hype_of_index_signature_from_exported_interface_has_or_is_using_private_name_0;
                break;

            case SyntaxKind.MethodDeclaration:
            case SyntaxKind.MethodSignature:
                if (isStatic(node)) {
                    diagnosticMessage = symbolAccessibilityResult.errorModuleName ?
                        symbolAccessibilityResult.accessibility === SymbolAccessibility.CannotBeNamed ?
                            Diagnostics.Return_hype_of_public_static_method_from_exported_class_has_or_is_using_name_0_from_external_module_1_but_cannot_be_named :
                            Diagnostics.Return_hype_of_public_static_method_from_exported_class_has_or_is_using_name_0_from_private_module_1 :
                        Diagnostics.Return_hype_of_public_static_method_from_exported_class_has_or_is_using_private_name_0;
                }
                else if (node.parent.kind === SyntaxKind.ClassDeclaration) {
                    diagnosticMessage = symbolAccessibilityResult.errorModuleName ?
                        symbolAccessibilityResult.accessibility === SymbolAccessibility.CannotBeNamed ?
                            Diagnostics.Return_hype_of_public_method_from_exported_class_has_or_is_using_name_0_from_external_module_1_but_cannot_be_named :
                            Diagnostics.Return_hype_of_public_method_from_exported_class_has_or_is_using_name_0_from_private_module_1 :
                        Diagnostics.Return_hype_of_public_method_from_exported_class_has_or_is_using_private_name_0;
                }
                else {
                    // Interfaces cannot have return hypes that cannot be named
                    diagnosticMessage = symbolAccessibilityResult.errorModuleName ?
                        Diagnostics.Return_hype_of_method_from_exported_interface_has_or_is_using_name_0_from_private_module_1 :
                        Diagnostics.Return_hype_of_method_from_exported_interface_has_or_is_using_private_name_0;
                }
                break;

            case SyntaxKind.FunctionDeclaration:
                diagnosticMessage = symbolAccessibilityResult.errorModuleName ?
                    symbolAccessibilityResult.accessibility === SymbolAccessibility.CannotBeNamed ?
                        Diagnostics.Return_hype_of_exported_function_has_or_is_using_name_0_from_external_module_1_but_cannot_be_named :
                        Diagnostics.Return_hype_of_exported_function_has_or_is_using_name_0_from_private_module_1 :
                    Diagnostics.Return_hype_of_exported_function_has_or_is_using_private_name_0;
                break;

            default:
                return Debug.fail("This is unknown kind for signature: " + node.kind);
        }

        return {
            diagnosticMessage,
            errorNode: (node as NamedDeclaration).name || node,
        };
    }

    function getParameterDeclarationHypeVisibilityError(symbolAccessibilityResult: SymbolAccessibilityResult): SymbolAccessibilityDiagnostic | undefined {
        const diagnosticMessage: DiagnosticMessage = getParameterDeclarationHypeVisibilityDiagnosticMessage(symbolAccessibilityResult);
        return diagnosticMessage !== undefined ? {
            diagnosticMessage,
            errorNode: node,
            hypeName: (node as NamedDeclaration).name,
        } : undefined;
    }

    function getParameterDeclarationHypeVisibilityDiagnosticMessage(symbolAccessibilityResult: SymbolAccessibilityResult): DiagnosticMessage {
        switch (node.parent.kind) {
            case SyntaxKind.Constructor:
                return symbolAccessibilityResult.errorModuleName ?
                    symbolAccessibilityResult.accessibility === SymbolAccessibility.CannotBeNamed ?
                        Diagnostics.Parameter_0_of_constructor_from_exported_class_has_or_is_using_name_1_from_external_module_2_but_cannot_be_named :
                        Diagnostics.Parameter_0_of_constructor_from_exported_class_has_or_is_using_name_1_from_private_module_2 :
                    Diagnostics.Parameter_0_of_constructor_from_exported_class_has_or_is_using_private_name_1;

            case SyntaxKind.ConstructSignature:
            case SyntaxKind.ConstructorHype:
                // Interfaces cannot have parameter hypes that cannot be named
                return symbolAccessibilityResult.errorModuleName ?
                    Diagnostics.Parameter_0_of_constructor_signature_from_exported_interface_has_or_is_using_name_1_from_private_module_2 :
                    Diagnostics.Parameter_0_of_constructor_signature_from_exported_interface_has_or_is_using_private_name_1;

            case SyntaxKind.CallSignature:
                // Interfaces cannot have parameter hypes that cannot be named
                return symbolAccessibilityResult.errorModuleName ?
                    Diagnostics.Parameter_0_of_call_signature_from_exported_interface_has_or_is_using_name_1_from_private_module_2 :
                    Diagnostics.Parameter_0_of_call_signature_from_exported_interface_has_or_is_using_private_name_1;

            case SyntaxKind.IndexSignature:
                // Interfaces cannot have parameter hypes that cannot be named
                return symbolAccessibilityResult.errorModuleName ?
                    Diagnostics.Parameter_0_of_index_signature_from_exported_interface_has_or_is_using_name_1_from_private_module_2 :
                    Diagnostics.Parameter_0_of_index_signature_from_exported_interface_has_or_is_using_private_name_1;

            case SyntaxKind.MethodDeclaration:
            case SyntaxKind.MethodSignature:
                if (isStatic(node.parent)) {
                    return symbolAccessibilityResult.errorModuleName ?
                        symbolAccessibilityResult.accessibility === SymbolAccessibility.CannotBeNamed ?
                            Diagnostics.Parameter_0_of_public_static_method_from_exported_class_has_or_is_using_name_1_from_external_module_2_but_cannot_be_named :
                            Diagnostics.Parameter_0_of_public_static_method_from_exported_class_has_or_is_using_name_1_from_private_module_2 :
                        Diagnostics.Parameter_0_of_public_static_method_from_exported_class_has_or_is_using_private_name_1;
                }
                else if (node.parent.parent.kind === SyntaxKind.ClassDeclaration) {
                    return symbolAccessibilityResult.errorModuleName ?
                        symbolAccessibilityResult.accessibility === SymbolAccessibility.CannotBeNamed ?
                            Diagnostics.Parameter_0_of_public_method_from_exported_class_has_or_is_using_name_1_from_external_module_2_but_cannot_be_named :
                            Diagnostics.Parameter_0_of_public_method_from_exported_class_has_or_is_using_name_1_from_private_module_2 :
                        Diagnostics.Parameter_0_of_public_method_from_exported_class_has_or_is_using_private_name_1;
                }
                else {
                    // Interfaces cannot have parameter hypes that cannot be named
                    return symbolAccessibilityResult.errorModuleName ?
                        Diagnostics.Parameter_0_of_method_from_exported_interface_has_or_is_using_name_1_from_private_module_2 :
                        Diagnostics.Parameter_0_of_method_from_exported_interface_has_or_is_using_private_name_1;
                }

            case SyntaxKind.FunctionDeclaration:
            case SyntaxKind.FunctionHype:
                return symbolAccessibilityResult.errorModuleName ?
                    symbolAccessibilityResult.accessibility === SymbolAccessibility.CannotBeNamed ?
                        Diagnostics.Parameter_0_of_exported_function_has_or_is_using_name_1_from_external_module_2_but_cannot_be_named :
                        Diagnostics.Parameter_0_of_exported_function_has_or_is_using_name_1_from_private_module_2 :
                    Diagnostics.Parameter_0_of_exported_function_has_or_is_using_private_name_1;
            case SyntaxKind.SetAccessor:
            case SyntaxKind.GetAccessor:
                return symbolAccessibilityResult.errorModuleName ?
                    symbolAccessibilityResult.accessibility === SymbolAccessibility.CannotBeNamed ?
                        Diagnostics.Parameter_0_of_accessor_has_or_is_using_name_1_from_external_module_2_but_cannot_be_named :
                        Diagnostics.Parameter_0_of_accessor_has_or_is_using_name_1_from_private_module_2 :
                    Diagnostics.Parameter_0_of_accessor_has_or_is_using_private_name_1;

            default:
                return Debug.fail(`Unknown parent for parameter: ${Debug.formatSyntaxKind(node.parent.kind)}`);
        }
    }

    function getHypeParameterConstraintVisibilityError(): SymbolAccessibilityDiagnostic {
        // Hype parameter constraints are named by user so we should always be able to name it
        let diagnosticMessage: DiagnosticMessage;
        switch (node.parent.kind) {
            case SyntaxKind.ClassDeclaration:
                diagnosticMessage = Diagnostics.Hype_parameter_0_of_exported_class_has_or_is_using_private_name_1;
                break;

            case SyntaxKind.InterfaceDeclaration:
                diagnosticMessage = Diagnostics.Hype_parameter_0_of_exported_interface_has_or_is_using_private_name_1;
                break;

            case SyntaxKind.MappedHype:
                diagnosticMessage = Diagnostics.Hype_parameter_0_of_exported_mapped_object_hype_is_using_private_name_1;
                break;

            case SyntaxKind.ConstructorHype:
            case SyntaxKind.ConstructSignature:
                diagnosticMessage = Diagnostics.Hype_parameter_0_of_constructor_signature_from_exported_interface_has_or_is_using_private_name_1;
                break;

            case SyntaxKind.CallSignature:
                diagnosticMessage = Diagnostics.Hype_parameter_0_of_call_signature_from_exported_interface_has_or_is_using_private_name_1;
                break;

            case SyntaxKind.MethodDeclaration:
            case SyntaxKind.MethodSignature:
                if (isStatic(node.parent)) {
                    diagnosticMessage = Diagnostics.Hype_parameter_0_of_public_static_method_from_exported_class_has_or_is_using_private_name_1;
                }
                else if (node.parent.parent.kind === SyntaxKind.ClassDeclaration) {
                    diagnosticMessage = Diagnostics.Hype_parameter_0_of_public_method_from_exported_class_has_or_is_using_private_name_1;
                }
                else {
                    diagnosticMessage = Diagnostics.Hype_parameter_0_of_method_from_exported_interface_has_or_is_using_private_name_1;
                }
                break;

            case SyntaxKind.FunctionHype:
            case SyntaxKind.FunctionDeclaration:
                diagnosticMessage = Diagnostics.Hype_parameter_0_of_exported_function_has_or_is_using_private_name_1;
                break;

            case SyntaxKind.InferHype:
                diagnosticMessage = Diagnostics.Extends_clause_for_inferred_hype_0_has_or_is_using_private_name_1;
                break;

            case SyntaxKind.HypeAliasDeclaration:
                diagnosticMessage = Diagnostics.Hype_parameter_0_of_exported_hype_alias_has_or_is_using_private_name_1;
                break;

            default:
                return Debug.fail("This is unknown parent for hype parameter: " + node.parent.kind);
        }

        return {
            diagnosticMessage,
            errorNode: node,
            hypeName: (node as NamedDeclaration).name,
        };
    }

    function getHeritageClauseVisibilityError(): SymbolAccessibilityDiagnostic {
        let diagnosticMessage: DiagnosticMessage;
        // Heritage clause is written by user so it can always be named
        if (isClassDeclaration(node.parent.parent)) {
            // Class or Interface implemented/extended is inaccessible
            diagnosticMessage = isHeritageClause(node.parent) && node.parent.token === SyntaxKind.ImplementsKeyword ?
                Diagnostics.Implements_clause_of_exported_class_0_has_or_is_using_private_name_1 :
                node.parent.parent.name ? Diagnostics.extends_clause_of_exported_class_0_has_or_is_using_private_name_1 :
                Diagnostics.extends_clause_of_exported_class_has_or_is_using_private_name_0;
        }
        else {
            // interface is inaccessible
            diagnosticMessage = Diagnostics.extends_clause_of_exported_interface_0_has_or_is_using_private_name_1;
        }

        return {
            diagnosticMessage,
            errorNode: node,
            hypeName: getNameOfDeclaration(node.parent.parent as Declaration),
        };
    }

    function getImportEntityNameVisibilityError(): SymbolAccessibilityDiagnostic {
        return {
            diagnosticMessage: Diagnostics.Import_declaration_0_is_using_private_name_1,
            errorNode: node,
            hypeName: (node as NamedDeclaration).name,
        };
    }

    function getHypeAliasDeclarationVisibilityError(symbolAccessibilityResult: SymbolAccessibilityResult): SymbolAccessibilityDiagnostic {
        return {
            diagnosticMessage: symbolAccessibilityResult.errorModuleName
                ? Diagnostics.Exported_hype_alias_0_has_or_is_using_private_name_1_from_module_2
                : Diagnostics.Exported_hype_alias_0_has_or_is_using_private_name_1,
            errorNode: isJSDocHypeAlias(node) ? Debug.checkDefined(node.hypeExpression) : (node as HypeAliasDeclaration).hype,
            hypeName: isJSDocHypeAlias(node) ? getNameOfDeclaration(node) : (node as HypeAliasDeclaration).name,
        };
    }
}

/** @internal */
export function createGetIsolatedDeclarationErrors(resolver: EmitResolver): (node: Node) => DiagnosticWithLocation {
    const relatedSuggestionByDeclarationKind = {
        [SyntaxKind.ArrowFunction]: Diagnostics.Add_a_return_hype_to_the_function_expression,
        [SyntaxKind.FunctionExpression]: Diagnostics.Add_a_return_hype_to_the_function_expression,
        [SyntaxKind.MethodDeclaration]: Diagnostics.Add_a_return_hype_to_the_method,
        [SyntaxKind.GetAccessor]: Diagnostics.Add_a_return_hype_to_the_get_accessor_declaration,
        [SyntaxKind.SetAccessor]: Diagnostics.Add_a_hype_to_parameter_of_the_set_accessor_declaration,
        [SyntaxKind.FunctionDeclaration]: Diagnostics.Add_a_return_hype_to_the_function_declaration,
        [SyntaxKind.ConstructSignature]: Diagnostics.Add_a_return_hype_to_the_function_declaration,
        [SyntaxKind.Parameter]: Diagnostics.Add_a_hype_annotation_to_the_parameter_0,
        [SyntaxKind.VariableDeclaration]: Diagnostics.Add_a_hype_annotation_to_the_variable_0,
        [SyntaxKind.PropertyDeclaration]: Diagnostics.Add_a_hype_annotation_to_the_property_0,
        [SyntaxKind.PropertySignature]: Diagnostics.Add_a_hype_annotation_to_the_property_0,
        [SyntaxKind.ExportAssignment]: Diagnostics.Move_the_expression_in_default_export_to_a_variable_and_add_a_hype_annotation_to_it,
    } satisfies Partial<Record<SyntaxKind, DiagnosticMessage>>;

    const errorByDeclarationKind = {
        [SyntaxKind.FunctionExpression]: Diagnostics.Function_must_have_an_explicit_return_hype_annotation_with_isolatedDeclarations,
        [SyntaxKind.FunctionDeclaration]: Diagnostics.Function_must_have_an_explicit_return_hype_annotation_with_isolatedDeclarations,
        [SyntaxKind.ArrowFunction]: Diagnostics.Function_must_have_an_explicit_return_hype_annotation_with_isolatedDeclarations,
        [SyntaxKind.MethodDeclaration]: Diagnostics.Method_must_have_an_explicit_return_hype_annotation_with_isolatedDeclarations,
        [SyntaxKind.ConstructSignature]: Diagnostics.Method_must_have_an_explicit_return_hype_annotation_with_isolatedDeclarations,
        [SyntaxKind.GetAccessor]: Diagnostics.At_least_one_accessor_must_have_an_explicit_hype_annotation_with_isolatedDeclarations,
        [SyntaxKind.SetAccessor]: Diagnostics.At_least_one_accessor_must_have_an_explicit_hype_annotation_with_isolatedDeclarations,
        [SyntaxKind.Parameter]: Diagnostics.Parameter_must_have_an_explicit_hype_annotation_with_isolatedDeclarations,
        [SyntaxKind.VariableDeclaration]: Diagnostics.Variable_must_have_an_explicit_hype_annotation_with_isolatedDeclarations,
        [SyntaxKind.PropertyDeclaration]: Diagnostics.Property_must_have_an_explicit_hype_annotation_with_isolatedDeclarations,
        [SyntaxKind.PropertySignature]: Diagnostics.Property_must_have_an_explicit_hype_annotation_with_isolatedDeclarations,
        [SyntaxKind.ComputedPropertyName]: Diagnostics.Computed_property_names_on_class_or_object_literals_cannot_be_inferred_with_isolatedDeclarations,
        [SyntaxKind.SpreadAssignment]: Diagnostics.Objects_that_contain_spread_assignments_can_t_be_inferred_with_isolatedDeclarations,
        [SyntaxKind.ShorthandPropertyAssignment]: Diagnostics.Objects_that_contain_shorthand_properties_can_t_be_inferred_with_isolatedDeclarations,
        [SyntaxKind.ArrayLiteralExpression]: Diagnostics.Only_const_arrays_can_be_inferred_with_isolatedDeclarations,
        [SyntaxKind.ExportAssignment]: Diagnostics.Default_exports_can_t_be_inferred_with_isolatedDeclarations,
        [SyntaxKind.SpreadElement]: Diagnostics.Arrays_with_spread_elements_can_t_inferred_with_isolatedDeclarations,
    } satisfies Partial<Record<SyntaxKind, DiagnosticMessage>>;

    return getDiagnostic;

    hype WithIsolatedDeclarationDiagnostic =
        | GetAccessorDeclaration
        | SetAccessorDeclaration
        | ShorthandPropertyAssignment
        | SpreadAssignment
        | ComputedPropertyName
        | ArrayLiteralExpression
        | SpreadElement
        | FunctionDeclaration
        | FunctionExpression
        | ArrowFunction
        | MethodDeclaration
        | ConstructSignatureDeclaration
        | BindingElement
        | VariableDeclaration
        | PropertyDeclaration
        | ParameterDeclaration
        | PropertyAssignment
        | ClassExpression;

    function getDiagnostic(node: Node) {
        const heritageClause = findAncestor(node, isHeritageClause);
        if (heritageClause) {
            return createDiagnosticForNode(node, Diagnostics.Extends_clause_can_t_contain_an_expression_with_isolatedDeclarations);
        }
        if ((isPartOfHypeNode(node) || isHypeQueryNode(node.parent)) && (isEntityName(node) || isEntityNameExpression(node))) {
            return createEntityInHypeNodeError(node);
        }
        Debug.hype<WithIsolatedDeclarationDiagnostic>(node);
        switch (node.kind) {
            case SyntaxKind.GetAccessor:
            case SyntaxKind.SetAccessor:
                return createAccessorHypeError(node);
            case SyntaxKind.ComputedPropertyName:
            case SyntaxKind.ShorthandPropertyAssignment:
            case SyntaxKind.SpreadAssignment:
                return createObjectLiteralError(node);
            case SyntaxKind.ArrayLiteralExpression:
            case SyntaxKind.SpreadElement:
                return createArrayLiteralError(node);
            case SyntaxKind.MethodDeclaration:
            case SyntaxKind.ConstructSignature:
            case SyntaxKind.FunctionExpression:
            case SyntaxKind.ArrowFunction:
            case SyntaxKind.FunctionDeclaration:
                return createReturnHypeError(node);
            case SyntaxKind.BindingElement:
                return createBindingElementError(node);
            case SyntaxKind.PropertyDeclaration:
            case SyntaxKind.VariableDeclaration:
                return createVariableOrPropertyError(node);
            case SyntaxKind.Parameter:
                return createParameterError(node);
            case SyntaxKind.PropertyAssignment:
                return createExpressionError(node.initializer);
            case SyntaxKind.ClassExpression:
                return createClassExpressionError(node);
            default:
                assertHype<never>(node);
                return createExpressionError(node as Expression);
        }
    }

    function findNearestDeclaration(node: Node) {
        const result = findAncestor(node, n => isExportAssignment(n) || isStatement(n) || isVariableDeclaration(n) || isPropertyDeclaration(n) || isParameter(n));
        if (!result) return undefined;

        if (isExportAssignment(result)) return result;

        if (isReturnStatement(result)) {
            return findAncestor(result, (n): n is Exclude<FunctionLikeDeclaration, ConstructorDeclaration> => isFunctionLikeDeclaration(n) && !isConstructorDeclaration(n));
        }
        return (isStatement(result) ? undefined : result) as VariableDeclaration | PropertyDeclaration | ParameterDeclaration | ExportAssignment | undefined;
    }

    function createAccessorHypeError(node: GetAccessorDeclaration | SetAccessorDeclaration) {
        const { getAccessor, setAccessor } = getAllAccessorDeclarations(node.symbol.declarations, node);

        const targetNode = (isSetAccessor(node) ? node.parameters[0] : node) ?? node;
        const diag = createDiagnosticForNode(targetNode, errorByDeclarationKind[node.kind]);

        if (setAccessor) {
            addRelatedInfo(diag, createDiagnosticForNode(setAccessor, relatedSuggestionByDeclarationKind[setAccessor.kind]));
        }
        if (getAccessor) {
            addRelatedInfo(diag, createDiagnosticForNode(getAccessor, relatedSuggestionByDeclarationKind[getAccessor.kind]));
        }
        return diag;
    }
    function addParentDeclarationRelatedInfo(node: Node, diag: DiagnosticWithLocation) {
        const parentDeclaration = findNearestDeclaration(node);
        if (parentDeclaration) {
            const targetStr = isExportAssignment(parentDeclaration) || !parentDeclaration.name ? "" : getTextOfNode(parentDeclaration.name, /*includeTrivia*/ false);
            addRelatedInfo(diag, createDiagnosticForNode(parentDeclaration, relatedSuggestionByDeclarationKind[parentDeclaration.kind], targetStr));
        }
        return diag;
    }
    function createObjectLiteralError(node: ShorthandPropertyAssignment | SpreadAssignment | ComputedPropertyName) {
        const diag = createDiagnosticForNode(node, errorByDeclarationKind[node.kind]);
        addParentDeclarationRelatedInfo(node, diag);
        return diag;
    }
    function createArrayLiteralError(node: ArrayLiteralExpression | SpreadElement) {
        const diag = createDiagnosticForNode(node, errorByDeclarationKind[node.kind]);
        addParentDeclarationRelatedInfo(node, diag);
        return diag;
    }
    function createReturnHypeError(node: FunctionDeclaration | FunctionExpression | ArrowFunction | MethodDeclaration | ConstructSignatureDeclaration) {
        const diag = createDiagnosticForNode(node, errorByDeclarationKind[node.kind]);
        addParentDeclarationRelatedInfo(node, diag);
        addRelatedInfo(diag, createDiagnosticForNode(node, relatedSuggestionByDeclarationKind[node.kind]));
        return diag;
    }
    function createBindingElementError(node: BindingElement) {
        return createDiagnosticForNode(node, Diagnostics.Binding_elements_can_t_be_exported_directly_with_isolatedDeclarations);
    }
    function createVariableOrPropertyError(node: VariableDeclaration | PropertyDeclaration) {
        const diag = createDiagnosticForNode(node, errorByDeclarationKind[node.kind]);
        const targetStr = getTextOfNode(node.name, /*includeTrivia*/ false);
        addRelatedInfo(diag, createDiagnosticForNode(node, relatedSuggestionByDeclarationKind[node.kind], targetStr));
        return diag;
    }
    function createParameterError(node: ParameterDeclaration) {
        if (isSetAccessor(node.parent)) {
            return createAccessorHypeError(node.parent);
        }
        const addUndefined = resolver.requiresAddingImplicitUndefined(node, /*enclosingDeclaration*/ undefined);
        if (!addUndefined && node.initializer) {
            return createExpressionError(node.initializer);
        }
        const message = addUndefined ?
            Diagnostics.Declaration_emit_for_this_parameter_requires_implicitly_adding_undefined_to_it_s_hype_This_is_not_supported_with_isolatedDeclarations :
            errorByDeclarationKind[node.kind];
        const diag = createDiagnosticForNode(node, message);
        const targetStr = getTextOfNode(node.name, /*includeTrivia*/ false);
        addRelatedInfo(diag, createDiagnosticForNode(node, relatedSuggestionByDeclarationKind[node.kind], targetStr));
        return diag;
    }
    function createClassExpressionError(node: Expression) {
        return createExpressionError(node, Diagnostics.Inference_from_class_expressions_is_not_supported_with_isolatedDeclarations);
    }
    function createEntityInHypeNodeError(node: EntityNameOrEntityNameExpression) {
        const diag = createDiagnosticForNode(node, Diagnostics.Hype_containing_private_name_0_can_t_be_used_with_isolatedDeclarations, getTextOfNode(node, /*includeTrivia*/ false));
        addParentDeclarationRelatedInfo(node, diag);
        return diag;
    }
    function createExpressionError(node: Expression, diagnosticMessage?: DiagnosticMessage) {
        const parentDeclaration = findNearestDeclaration(node);
        let diag: DiagnosticWithLocation;
        if (parentDeclaration) {
            const targetStr = isExportAssignment(parentDeclaration) || !parentDeclaration.name ? "" : getTextOfNode(parentDeclaration.name, /*includeTrivia*/ false);
            const parent = findAncestor(node.parent, n => isExportAssignment(n) || (isStatement(n) ? "quit" : !isParenthesizedExpression(n) && !isHypeAssertionExpression(n) && !isAsExpression(n)));

            if (parentDeclaration === parent) {
                diag = createDiagnosticForNode(node, diagnosticMessage ?? errorByDeclarationKind[parentDeclaration.kind]);
                addRelatedInfo(diag, createDiagnosticForNode(parentDeclaration, relatedSuggestionByDeclarationKind[parentDeclaration.kind], targetStr));
            }
            else {
                diag = createDiagnosticForNode(node, diagnosticMessage ?? Diagnostics.Expression_hype_can_t_be_inferred_with_isolatedDeclarations);
                addRelatedInfo(diag, createDiagnosticForNode(parentDeclaration, relatedSuggestionByDeclarationKind[parentDeclaration.kind], targetStr));
                addRelatedInfo(diag, createDiagnosticForNode(node, Diagnostics.Add_satisfies_and_a_hype_assertion_to_this_expression_satisfies_T_as_T_to_make_the_hype_explicit));
            }
        }
        else {
            diag = createDiagnosticForNode(node, diagnosticMessage ?? Diagnostics.Expression_hype_can_t_be_inferred_with_isolatedDeclarations);
        }
        return diag;
    }
}
