(function (global) {
    'use strict';

    function requireGlobalModule(moduleName) {
        const module = global[moduleName];
        if (!module) throw new Error(`[game] Required module missing: ${moduleName}`);
        return module;
    }

    function requireModuleFunction(moduleName, functionName) {
        const module = requireGlobalModule(moduleName);
        const fn = module[functionName];
        if (typeof fn !== 'function') throw new Error(`[game] Required function missing: ${moduleName}.${functionName}`);
        return fn;
    }

    function assertObjectFunctions(objectName, target, functionNames) {
        functionNames.forEach((name) => {
            if (typeof target[name] !== 'function') throw new Error(`[game] Required function missing: ${objectName}.${name}`);
        });
    }

    global.KOVModuleUtils = {
        requireGlobalModule,
        requireModuleFunction,
        assertObjectFunctions
    };
})(window);