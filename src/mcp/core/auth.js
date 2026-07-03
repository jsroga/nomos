"use strict";
/**
 * MCP Authentication
 *
 * API key validation and service context creation for MCP server.
 */
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateApiKey = validateApiKey;
exports.getServiceContext = getServiceContext;
exports.hashApiKey = hashApiKey;
exports.generateApiKey = generateApiKey;
var supabase_js_1 = require("@supabase/supabase-js");
// ============================================
// SUPABASE CLIENT
// ============================================
function getSupabaseServiceClient() {
    var supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    var supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !supabaseServiceKey) {
        throw new Error('Missing Supabase configuration');
    }
    return (0, supabase_js_1.createClient)(supabaseUrl, supabaseServiceKey, {
        auth: {
            autoRefreshToken: false,
            persistSession: false,
        },
    });
}
// ============================================
// API KEY VALIDATION
// ============================================
/**
 * Validate an API key against the database
 */
function validateApiKey(apiKey) {
    return __awaiter(this, void 0, void 0, function () {
        var supabase, keyHash, _a, data, error, error_1;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    if (!apiKey) {
                        return [2 /*return*/, { valid: false, error: 'No API key provided' }];
                    }
                    // For development, allow a bypass key
                    if (process.env.NODE_ENV === 'development' && apiKey === 'dev-test-key') {
                        return [2 /*return*/, {
                                valid: true,
                                keyId: 'dev-key',
                                keyName: 'Development Key',
                                userId: process.env.DEV_USER_ID || 'dev-user',
                                scopes: ['*'],
                            }];
                    }
                    _b.label = 1;
                case 1:
                    _b.trys.push([1, 5, , 6]);
                    supabase = getSupabaseServiceClient();
                    return [4 /*yield*/, hashApiKey(apiKey)];
                case 2:
                    keyHash = _b.sent();
                    return [4 /*yield*/, supabase
                            .from('mcp_api_keys')
                            .select('id, name, user_id, scopes, is_active, expires_at')
                            .eq('key_hash', keyHash)
                            .single()];
                case 3:
                    _a = _b.sent(), data = _a.data, error = _a.error;
                    if (error || !data) {
                        return [2 /*return*/, { valid: false, error: 'Invalid API key' }];
                    }
                    // Check if key is active
                    if (!data.is_active) {
                        return [2 /*return*/, { valid: false, error: 'API key is disabled' }];
                    }
                    // Check if key has expired
                    if (data.expires_at && new Date(data.expires_at) < new Date()) {
                        return [2 /*return*/, { valid: false, error: 'API key has expired' }];
                    }
                    // Update last used timestamp
                    return [4 /*yield*/, supabase
                            .from('mcp_api_keys')
                            .update({ last_used_at: new Date().toISOString() })
                            .eq('id', data.id)];
                case 4:
                    // Update last used timestamp
                    _b.sent();
                    return [2 /*return*/, {
                            valid: true,
                            keyId: data.id,
                            keyName: data.name,
                            userId: data.user_id,
                            scopes: data.scopes || ['*'],
                        }];
                case 5:
                    error_1 = _b.sent();
                    console.error('[MCP Auth] Error validating API key:', error_1);
                    return [2 /*return*/, { valid: false, error: 'Authentication error' }];
                case 6: return [2 /*return*/];
            }
        });
    });
}
/**
 * Create a service context for authenticated requests
 */
function getServiceContext(authResult) {
    return __awaiter(this, void 0, void 0, function () {
        var supabase;
        return __generator(this, function (_a) {
            if (!authResult.valid || !authResult.userId) {
                throw new Error('Invalid authentication result');
            }
            supabase = getSupabaseServiceClient();
            return [2 /*return*/, {
                    userId: authResult.userId,
                    supabase: supabase,
                    apiKeyId: authResult.keyId,
                    apiKeyName: authResult.keyName,
                    scopes: authResult.scopes || [],
                }];
        });
    });
}
/**
 * Check if a scope is allowed for the API key
 */
function hasScope(context, requiredScope) {
    // Wildcard allows all scopes
    if (context.scopes.includes('*')) {
        return true;
    }
    // Check for exact match or prefix match (e.g., 'entities:*' matches 'entities:read')
    return context.scopes.some(function (scope) {
        if (scope === requiredScope)
            return true;
        if (scope.endsWith(':*')) {
            var prefix = scope.slice(0, -1); // Remove '*'
            return requiredScope.startsWith(prefix);
        }
        return false;
    });
}
// ============================================
// UTILITIES
// ============================================
/**
 * Hash an API key for storage/lookup
 * Uses SHA-256 for consistent hashing
 */
function hashApiKey(apiKey) {
    return __awaiter(this, void 0, void 0, function () {
        var encoder, data, hashBuffer, hashArray;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    encoder = new TextEncoder();
                    data = encoder.encode(apiKey);
                    return [4 /*yield*/, crypto.subtle.digest('SHA-256', data)];
                case 1:
                    hashBuffer = _a.sent();
                    hashArray = Array.from(new Uint8Array(hashBuffer));
                    return [2 /*return*/, hashArray.map(function (b) { return b.toString(16).padStart(2, '0'); }).join('')];
            }
        });
    });
}
/**
 * Generate a new API key
 */
function generateApiKey() {
    var bytes = new Uint8Array(32);
    crypto.getRandomValues(bytes);
    var key = Array.from(bytes)
        .map(function (b) { return b.toString(16).padStart(2, '0'); })
        .join('');
    return "wbk_".concat(key); // Prefix for identification
}
/**
 * Create a new API key in the database
 */
function createApiKey(userId_1, name_1) {
    return __awaiter(this, arguments, void 0, function (userId, name, scopes, expiresAt) {
        var supabase, apiKey, keyHash, _a, data, error;
        if (scopes === void 0) { scopes = ['*']; }
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    supabase = getSupabaseServiceClient();
                    apiKey = generateApiKey();
                    return [4 /*yield*/, hashApiKey(apiKey)];
                case 1:
                    keyHash = _b.sent();
                    return [4 /*yield*/, supabase
                            .from('mcp_api_keys')
                            .insert({
                            user_id: userId,
                            name: name,
                            key_hash: keyHash,
                            scopes: scopes,
                            expires_at: expiresAt === null || expiresAt === void 0 ? void 0 : expiresAt.toISOString(),
                            is_active: true,
                        })
                            .select('id')
                            .single()];
                case 2:
                    _a = _b.sent(), data = _a.data, error = _a.error;
                    if (error) {
                        throw new Error("Failed to create API key: ".concat(error.message));
                    }
                    // Return the plain text key - this is the only time it's visible
                    return [2 /*return*/, { apiKey: apiKey, keyId: data.id }];
            }
        });
    });
}
