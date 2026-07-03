"use strict";
/**
 * MCP Resources Registry
 *
 * Resources provide read-only access to data.
 * Unlike tools, resources are for data retrieval only.
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
exports.mcpResources = void 0;
var services_1 = require("@/services");
var auth_1 = require("../core/auth");
// ============================================
// HELPERS
// ============================================
/**
 * Parse a resource URI and extract parameters
 */
function parseResourceUri(uri) {
    // wbk://projects
    if (uri === 'wbk://projects') {
        return { type: 'projects', params: {} };
    }
    // wbk://project/{projectId}/entities
    var entitiesMatch = uri.match(/^wbk:\/\/project\/([^/]+)\/entities$/);
    if (entitiesMatch) {
        return { type: 'project-entities', params: { projectId: entitiesMatch[1] } };
    }
    // wbk://project/{projectId}/characters
    var charactersMatch = uri.match(/^wbk:\/\/project\/([^/]+)\/characters$/);
    if (charactersMatch) {
        return { type: 'project-characters', params: { projectId: charactersMatch[1] } };
    }
    // wbk://project/{projectId}/episodes
    var episodesMatch = uri.match(/^wbk:\/\/project\/([^/]+)\/episodes$/);
    if (episodesMatch) {
        return { type: 'project-episodes', params: { projectId: episodesMatch[1] } };
    }
    // wbk://project/{projectId}/series-bible
    var bibleMatch = uri.match(/^wbk:\/\/project\/([^/]+)\/series-bible$/);
    if (bibleMatch) {
        return { type: 'series-bible', params: { projectId: bibleMatch[1] } };
    }
    // wbk://episode/{episodeId}/beats
    var beatsMatch = uri.match(/^wbk:\/\/episode\/([^/]+)\/beats$/);
    if (beatsMatch) {
        return { type: 'episode-beats', params: { episodeId: beatsMatch[1] } };
    }
    throw new Error("Unknown resource URI: ".concat(uri));
}
// ============================================
// RESOURCE IMPLEMENTATION
// ============================================
exports.mcpResources = {
    listResources: function () { return __awaiter(void 0, void 0, void 0, function () {
        return __generator(this, function (_a) {
            // Auth check optional for listing? Let's check env var presence at least
            // But listResources usually doesn't take args, so passing API key is hard unless global or env.
            // In stdio, env var is the way.
            return [2 /*return*/, [
                    {
                        uri: 'wbk://projects',
                        name: 'Projects List',
                        description: 'List of all projects accessible to the current user',
                        mimeType: 'application/json',
                    },
                    {
                        uri: 'wbk://project/{projectId}/entities',
                        name: 'Project Entities',
                        description: 'All game entities in a project',
                        mimeType: 'application/json',
                    },
                    {
                        uri: 'wbk://project/{projectId}/characters',
                        name: 'Project Characters',
                        description: 'All characters in a project',
                        mimeType: 'application/json',
                    },
                    {
                        uri: 'wbk://project/{projectId}/episodes',
                        name: 'Project Episodes',
                        description: 'All episodes in a project',
                        mimeType: 'application/json',
                    },
                    {
                        uri: 'wbk://project/{projectId}/series-bible',
                        name: 'Series Bible',
                        description: 'The series bible for a project containing world description, characters, factions, and story plan',
                        mimeType: 'application/json',
                    },
                    {
                        uri: 'wbk://episode/{episodeId}/beats',
                        name: 'Episode Beats',
                        description: 'All beats in an episode',
                        mimeType: 'application/json',
                    },
                ]];
        });
    }); },
    getResourceContent: function (_a) { return __awaiter(void 0, [_a], void 0, function (_b) {
        var apiKey, authResult, context, _c, type, params, result, _d, _e, data, error;
        var uri = _b.uri;
        return __generator(this, function (_f) {
            switch (_f.label) {
                case 0:
                    apiKey = process.env.MCP_API_KEY;
                    if (!apiKey)
                        throw new Error('MCP_API_KEY environment variable not set');
                    return [4 /*yield*/, (0, auth_1.validateApiKey)(apiKey)];
                case 1:
                    authResult = _f.sent();
                    if (!authResult.valid)
                        throw new Error('Invalid API key');
                    return [4 /*yield*/, (0, auth_1.getServiceContext)(authResult)];
                case 2:
                    context = _f.sent();
                    _c = parseResourceUri(uri), type = _c.type, params = _c.params;
                    _d = type;
                    switch (_d) {
                        case 'projects': return [3 /*break*/, 3];
                        case 'project-entities': return [3 /*break*/, 5];
                        case 'project-characters': return [3 /*break*/, 7];
                        case 'project-episodes': return [3 /*break*/, 9];
                        case 'series-bible': return [3 /*break*/, 11];
                        case 'episode-beats': return [3 /*break*/, 13];
                    }
                    return [3 /*break*/, 15];
                case 3: return [4 /*yield*/, context.supabase
                        .from('projects')
                        .select('id, name, description, created_at, updated_at')
                        .eq('user_id', context.userId)
                        .order('updated_at', { ascending: false })];
                case 4:
                    _e = _f.sent(), data = _e.data, error = _e.error;
                    if (error)
                        throw new Error("Failed to fetch projects: ".concat(error.message));
                    result = { projects: data };
                    return [3 /*break*/, 16];
                case 5: return [4 /*yield*/, services_1.entitiesService.list({ projectId: params.projectId }, { userId: context.userId, supabase: context.supabase })];
                case 6:
                    result = _f.sent();
                    return [3 /*break*/, 16];
                case 7: return [4 /*yield*/, services_1.storytellerService.listCharacters({ projectId: params.projectId }, { userId: context.userId })];
                case 8:
                    result = _f.sent();
                    return [3 /*break*/, 16];
                case 9: return [4 /*yield*/, services_1.storytellerService.listEpisodes({ projectId: params.projectId }, { userId: context.userId })];
                case 10:
                    result = _f.sent();
                    return [3 /*break*/, 16];
                case 11: return [4 /*yield*/, services_1.storytellerService.getSeriesBible(params.projectId, {
                        userId: context.userId,
                    })];
                case 12:
                    result = _f.sent();
                    return [3 /*break*/, 16];
                case 13: return [4 /*yield*/, services_1.storytellerService.listBeats({ episodeId: params.episodeId }, { userId: context.userId })];
                case 14:
                    result = _f.sent();
                    return [3 /*break*/, 16];
                case 15: throw new Error("Unknown resource type: ".concat(type));
                case 16: return [2 /*return*/, {
                        text: JSON.stringify(result, null, 2),
                    }];
            }
        });
    }); },
};
