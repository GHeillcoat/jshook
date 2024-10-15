// ==UserScript==
// @name         Enhanced Web Activity Hook
// @namespace    http://tampermonkey.net/
// @version      2024-10-15
// @description  Comprehensive web activity monitoring and logging
// @author       You
// @match        https://*/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=bing.com
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    // 全局控制变量
    window.__hookConfig = {
        enableDebugger: false,
        logToConsole: true,
        logLevel: 'info' // 'info', 'warn', 'error'
    };

    // 用于存储原始值和方法
    const original = {
        windowProps: {}, documentProps: {}, locationProps: {},
        navigatorProps: {}, historyProps: {}, screenProps: {}, methods: {}
    };

    // 用于存储上一次的日志数据（不包括时间戳）
    let lastLogData = null;

    // 获取高精度时间戳
    function getHighPrecisionTimestamp() {
        return new Date().toISOString() + performance.now().toFixed(3).slice(1);
    }

    // 日志记录函数
    function logHookEvent(type, target, property, value = undefined) {
        if (window.__hookConfig.logToConsole) {
            const currentLogData = {
                "操作类型": type,
                "目标对象": target,
                "属性/方法": property,
                "值/参数": value !== undefined ? JSON.stringify(value) : '无'
            };

            // 比较当前日志数据与上一次的日志数据
            if (!lastLogData || !isEqual(currentLogData, lastLogData)) {
                const logData = {
                    "时间戳": getHighPrecisionTimestamp(),
                    ...currentLogData
                };
                switch(window.__hookConfig.logLevel) {
                    case 'warn':
                        console.warn(logData);
                        break;
                    case 'error':
                        console.error(logData);
                        break;
                    default:
                        console.log(logData);
                }
                lastLogData = currentLogData;
            }
        }
        if (window.__hookConfig.enableDebugger) {
            debugger;
        }
    }

    // 比较两个对象是否相等
    function isEqual(obj1, obj2) {
        return JSON.stringify(obj1) === JSON.stringify(obj2);
    }

    // Hook函数
    function hook(obj, prop) {
        if (obj.hasOwnProperty(prop)) {
            const objName = obj.constructor.name;
            if (typeof obj[prop] === 'function') {
                original.methods[`${objName}.${prop}`] = obj[prop];
                obj[prop] = function() {
                    logHookEvent('调用', objName, prop, Array.from(arguments));
                    return original.methods[`${objName}.${prop}`].apply(this, arguments);
                };
            } else {
                original[`${objName.toLowerCase()}Props`][prop] = obj[prop];
                Object.defineProperty(obj, prop, {
                    get: function() {
                        logHookEvent('获取', objName, prop);
                        return original[`${objName.toLowerCase()}Props`][prop];
                    },
                    set: function(val) {
                        logHookEvent('设置', objName, prop, val);
                        original[`${objName.toLowerCase()}Props`][prop] = val;
                    }
                });
            }
        }
    }

    // Hook window属性和方法
    [
        'localStorage', 'sessionStorage', 'indexedDB', 'fetch', 'XMLHttpRequest', 'requestAnimationFrame', 'cancelAnimationFrame',
        'alert', 'confirm', 'prompt', 'open', 'eval'
    ].forEach(prop => hook(window, prop));

    // Hook document属性和方法
    [
        'cookie', 'domain', 'referrer', 'title', 'URL',
        'getElementById', 'getElementsByClassName', 'getElementsByName', 'getElementsByTagName',
        'querySelector', 'querySelectorAll', 'createElement'
    ].forEach(prop => hook(document, prop));

    // Hook location属性
    ['href', 'protocol', 'host', 'hostname', 'port', 'pathname', 'search', 'hash', 'origin'].forEach(prop => hook(location, prop));

    // Hook navigator属性
    [
        'userAgent', 'language', 'languages', 'platform', 'vendor', 'appName', 'appVersion',
        'product', 'productSub', 'onLine', 'hardwareConcurrency', 'maxTouchPoints'
    ].forEach(prop => hook(navigator, prop));

    // Hook history方法
    ['pushState', 'replaceState', 'go', 'back', 'forward'].forEach(prop => hook(history, prop));

    // Hook screen属性
    ['width', 'height', 'availWidth', 'availHeight', 'colorDepth', 'pixelDepth'].forEach(prop => hook(screen, prop));

    // Hook XMLHttpRequest using Proxy
    const OriginalXHR = window.XMLHttpRequest;
    window.XMLHttpRequest = new Proxy(OriginalXHR, {
        construct(target, args) {
            const xhr = new target(...args);
            ['open', 'send', 'setRequestHeader'].forEach(method => {
                xhr[method] = new Proxy(xhr[method], {
                    apply(target, thisArg, argumentsList) {
                        logHookEvent('调用', 'XMLHttpRequest', method, argumentsList);
                        return target.apply(thisArg, argumentsList);
                    }
                });
            });
            return xhr;
        }
    });

    // Hook Fetch API
    const originalFetch = window.fetch;
    window.fetch = function() {
        logHookEvent('调用', 'window', 'fetch', Array.from(arguments));
        return originalFetch.apply(this, arguments);
    };

    // Hook Canvas
    const originalGetContext = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function() {
        logHookEvent('调用', 'HTMLCanvasElement', 'getContext', Array.from(arguments));
        const context = originalGetContext.apply(this, arguments);
        if (context) {
            // Hook 2D context methods
            if (arguments[0] === '2d') {
                [
                    'fillRect', 'clearRect', 'strokeRect', 'fillText', 'strokeText',
                    'measureText', 'getImageData', 'putImageData', 'drawImage',
                    'createImageData', 'getLineDash', 'setLineDash', 'createPattern',
                    'createLinearGradient', 'createRadialGradient'
                ].forEach(method => {
                    const original = context[method];
                    context[method] = function() {
                        logHookEvent('调用', 'CanvasRenderingContext2D', method, Array.from(arguments));
                        return original.apply(this, arguments);
                    };
                });
            }
            // Hook WebGL context methods
            else if (arguments[0] === 'webgl' || arguments[0] === 'webgl2') {
                [
                    'clear', 'drawArrays', 'drawElements', 'bufferData', 'bufferSubData',
                    'getUniformLocation', 'uniform1f', 'uniform2f', 'uniform3f', 'uniform4f',
                    'uniform1i', 'uniform2i', 'uniform3i', 'uniform4i'
                ].forEach(method => {
                    const original = context[method];
                    context[method] = function() {
                        logHookEvent('调用', 'WebGLRenderingContext', method, Array.from(arguments));
                        return original.apply(this, arguments);
                    };
                });
            }
        }
        return context;
    };

    // Hook toDataURL and toBlob methods
    ['toDataURL', 'toBlob'].forEach(method => {
        const original = HTMLCanvasElement.prototype[method];
        HTMLCanvasElement.prototype[method] = function() {
            logHookEvent('调用', 'HTMLCanvasElement', method, Array.from(arguments));
            return original.apply(this, arguments);
        };
    });

    // Hook document.cookie
    let originalCookie = Object.getOwnPropertyDescriptor(Document.prototype, 'cookie');
    Object.defineProperty(document, 'cookie', {
        get: function() {
            logHookEvent('获取', 'Document', 'cookie');
            return originalCookie.get.call(this);
        },
        set: function(val) {
            logHookEvent('设置', 'Document', 'cookie', val);
            return originalCookie.set.call(this, val);
        }
    });

    // Hook JSON methods
    ['stringify', 'parse'].forEach(method => {
        const original = JSON[method];
        JSON[method] = function() {
            logHookEvent('调用', 'JSON', method, Array.from(arguments));
            return original.apply(this, arguments);
        };
    });

    // Hook String prototype methods
    ['toString', 'valueOf', 'trim', 'trimStart', 'trimEnd', 'toLowerCase', 'toUpperCase'].forEach(method => {
        const original = String.prototype[method];
        String.prototype[method] = function() {
            logHookEvent('调用', 'String', method, Array.from(arguments));
            return original.apply(this, arguments);
        };
    });

    // Hook eval
    const originalEval = window.eval;
    window.eval = function() {
        logHookEvent('调用', 'window', 'eval', Array.from(arguments));
        return originalEval.apply(this, arguments);
    };

    console.log('Enhanced Web Activity Hook loaded successfully');
})();