/**
 * Generated API types for Domo product APIs
 * Auto-generated, do not modify manually
 */

// Types from AI-Services-API.yaml
export namespace AI_Services_API {
    interface paths {
        '/api/ai/v1/text/generation"': {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            get?: never;
            put?: never;
            /** Text Generation */
            post: {
                parameters: {
                    query?: never;
                    header?: never;
                    path?: never;
                    cookie?: never;
                };
                requestBody?: never;
                responses: {
                    200: {
                        headers: {
                            [name: string]: unknown;
                        };
                        content: {
                            /** @example 200:{ "output": "The sky is blue because of Rayleigh scattering.", "modelId": "domo.domo\_ai.domogpt-chat-small-v1:anthropic"}
                             *      */
                            "application/json": unknown;
                        };
                    };
                };
            };
            delete?: never;
            options?: never;
            head?: never;
            patch?: never;
            trace?: never;
        };
        "/api/ai/v1/text/sql": {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            get?: never;
            put?: never;
            /** Text-to-SQL */
            post: {
                parameters: {
                    query?: never;
                    header?: never;
                    path?: never;
                    cookie?: never;
                };
                requestBody?: never;
                responses: {
                    200: {
                        headers: {
                            [name: string]: unknown;
                        };
                        content: {
                            /** @example 200:{ "output": "SELECT region, SUM(amount) AS total\_sales FROM `Store Sales` GROUP BY region", "modelId": "domo.domo\_ai.domogpt-sql-v1:anthropic"}
                             *      */
                            "application/json": unknown;
                        };
                    };
                };
            };
            delete?: never;
            options?: never;
            head?: never;
            patch?: never;
            trace?: never;
        };
        "https://{instance}.domo.com/api/ai/v1/text/summarize": {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            get?: never;
            put?: never;
            /** Text Summarization */
            post: {
                parameters: {
                    query?: never;
                    header?: never;
                    path?: never;
                    cookie?: never;
                };
                requestBody?: never;
                responses: {
                    200: {
                        headers: {
                            [name: string]: unknown;
                        };
                        content: {
                            /** @example 200:{ "output": "Vibrant, densely populated commercial and cultural hub in Northern California.", "modelId": "domo.domo\_ai.domogpt-summarize-v1:anthropic"}
                             *      */
                            "application/json": unknown;
                        };
                    };
                };
            };
            delete?: never;
            options?: never;
            head?: never;
            patch?: never;
            trace?: never;
        };
        "/api/ai/v1/execute": {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            get?: never;
            put?: never;
            /**
             * Execute AI Service
             * @remarks Executes an AI service.
             */
            post: {
                parameters: {
                    query?: never;
                    header?: never;
                    path?: never;
                    cookie?: never;
                };
                requestBody: {
                    content: {
                        "application/json": Record<string, never>;
                    };
                };
                responses: {
                    /** @remarks AI service response */
                    200: {
                        headers: {
                            [name: string]: unknown;
                        };
                        content: {
                            /** @example {
                             *       "result": "AI output"
                             *     } */
                            "application/json": unknown;
                        };
                    };
                };
            };
            delete?: never;
            options?: never;
            head?: never;
            patch?: never;
            trace?: never;
        };
    }
    type webhooks = Record<string, never>;
    interface components {
        schemas: never;
        responses: never;
        parameters: never;
        requestBodies: never;
        headers: never;
        pathItems: never;
    }
    type $defs = Record<string, never>;
    type operations = Record<string, never>;
}

// Types from Activity-Log-API.yaml
export namespace Activity_Log_API {
    interface paths {
        "/api/audit/v1/user-audits": {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            /**
             * Get Activity Log
             * @remarks Retrieves a list of user activity logs based on the provided query parameters.
             */
            get: {
                parameters: {
                    query: {
                        /** @remarks The start timestamp for the query (in milliseconds). */
                        start: number;
                        /** @remarks The end timestamp for the query (in milliseconds). */
                        end: number;
                        /** @remarks The results offset. */
                        offset?: number;
                        /** @remarks The maximum number of results to return. */
                        limit?: number;
                        /** @remarks A comma-separated list of object types to filter by. Valid values: `ACCOUNT`, `DATAFLOW_TYPE`, `DATA_SOURCE`. */
                        objectType?: string;
                    };
                    header?: never;
                    path?: never;
                    cookie?: never;
                };
                requestBody?: never;
                responses: {
                    200: {
                        headers: {
                            [name: string]: unknown;
                        };
                        content: {
                            /** @example [ { "userName": "Jae Wilson", "userId": "1893952720", "userType": "USER", "actionType": "VIEWED", "objectType": "ACTIVITY\_LOG", "additionalComment": "Jae Wilson viewed the activity log.", "time": 1654205894927, "eventText": "Viewed activity log" }, { "userName": "Bryan Van Kampen", "userId": "587894148", "userType": "USER", "actionType": "VIEWED", "objectType": "PAGE", "additionalComment": "Bryan Van Kampen viewed page 'How Should we manage this monster?'.", "time": 1654189333186, "eventText": "Viewed page" }]
                             *      */
                            "application/json": unknown;
                        };
                    };
                };
            };
            put?: never;
            post?: never;
            delete?: never;
            options?: never;
            head?: never;
            patch?: never;
            trace?: never;
        };
        "/api/audit/v1/user-audits/objectTypes": {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            /**
             * Get (Enumerate) Activity Log Object Types
             * @remarks Retrieves a list of available object types that can be queried in the Activity Log API.
             */
            get: {
                parameters: {
                    query?: never;
                    header?: never;
                    path?: never;
                    cookie?: never;
                };
                requestBody?: never;
                responses: {
                    200: {
                        headers: {
                            [name: string]: unknown;
                        };
                        content: {
                            /** @example [ "ACCOUNT", "DATAFLOW\_TYPE", "DATA\_SOURCE"]
                             *      */
                            "application/json": unknown;
                        };
                    };
                };
            };
            put?: never;
            post?: never;
            delete?: never;
            options?: never;
            head?: never;
            patch?: never;
            trace?: never;
        };
    }
    type webhooks = Record<string, never>;
    interface components {
        schemas: never;
        responses: never;
        parameters: never;
        requestBodies: never;
        headers: never;
        pathItems: never;
    }
    type $defs = Record<string, never>;
    type operations = Record<string, never>;
}

// Types from Beast-Modes-API.yaml
export namespace Beast_Modes_API {
    interface paths {
        "/api/query/v1/functions/statistics": {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            /**
             * Get Statistics
             * @remarks Fetch instance-wide statistics on Beast Mode usage.
             */
            get: {
                parameters: {
                    query?: never;
                    header?: never;
                    path?: never;
                    cookie?: never;
                };
                requestBody?: never;
                responses: {
                    /** @remarks Statistics response */
                    200: {
                        headers: {
                            [name: string]: unknown;
                        };
                        content: {
                            /** @example {
                             *       "total": 525,
                             *       "onDatasets": 406,
                             *       "onCards": 119,
                             *       "inVisualizations": 98,
                             *       "locked": 0,
                             *       "invalid": 0,
                             *       "invalidLink": 68,
                             *       "archived": 0
                             *     } */
                            "application/json": unknown;
                        };
                    };
                };
            };
            put?: never;
            post?: never;
            delete?: never;
            options?: never;
            head?: never;
            patch?: never;
            trace?: never;
        };
        "/api/query/v1/functions/search": {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            get?: never;
            put?: never;
            /**
             * Get All Beast Modes
             * @remarks Gets all Beast Mode objects in the instance.
             */
            post: {
                parameters: {
                    query?: never;
                    header?: never;
                    path?: never;
                    cookie?: never;
                };
                requestBody: {
                    content: {
                        "application/json": {
                            name?: string;
                            filters?: Record<string, never>[];
                            sort?: {
                                field?: string;
                                ascending?: boolean;
                            };
                            limit?: number;
                            offset?: number;
                        };
                    };
                };
                responses: {
                    /** @remarks Beast Modes response */
                    200: {
                        headers: {
                            [name: string]: unknown;
                        };
                        content: {
                            /** @example {
                             *       "totalHits": 525,
                             *       "results": [],
                             *       "hasMore": true,
                             *       "degraded": false
                             *     } */
                            "application/json": unknown;
                        };
                    };
                };
            };
            delete?: never;
            options?: never;
            head?: never;
            patch?: never;
            trace?: never;
        };
        "/api/query/v1/functions/template/{beastmodeId}": {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            /**
             * Get Beast Mode by Id
             * @remarks Gets a specified Beast Mode calculation.
             */
            get: {
                parameters: {
                    query?: never;
                    header?: never;
                    path: {
                        beastmodeId: number;
                    };
                    cookie?: never;
                };
                requestBody?: never;
                responses: {
                    /** @remarks Beast Mode response */
                    200: {
                        headers: {
                            [name: string]: unknown;
                        };
                        content: {
                            /** @example {
                             *       "id": 232,
                             *       "name": "% Change - Orders",
                             *       "owner": 27,
                             *       "locked": false,
                             *       "global": false,
                             *       "expression": "..."
                             *     } */
                            "application/json": unknown;
                        };
                    };
                };
            };
            /**
             * Update or Lock Beast Mode
             * @remarks Updates the formula that constitutes the calculation in the Beast Mode, or locks/unlocks the Beast Mode.
             *     If the 'strict' query parameter is present, the request updates the formula. Otherwise, it locks/unlocks the Beast Mode.
             */
            put: {
                parameters: {
                    query?: {
                        /** @remarks If true or false, updates the formula. If not present, locks/unlocks the Beast Mode. */
                        strict?: boolean;
                    };
                    header?: never;
                    path: {
                        beastmodeId: number;
                    };
                    cookie?: never;
                };
                requestBody: {
                    content: {
                        "application/json":
                            | {
                                  expression: string;
                              }
                            | {
                                  locked: boolean;
                              };
                    };
                };
                responses: {
                    /** @remarks Beast Mode update or lock response */
                    200: {
                        headers: {
                            [name: string]: unknown;
                        };
                        content: {
                            /** @example {
                             *       "id": 232,
                             *       "name": "% Change - Orders",
                             *       "locked": true,
                             *       "expression": "..."
                             *     } */
                            "application/json": unknown;
                        };
                    };
                };
            };
            post?: never;
            delete?: never;
            options?: never;
            head?: never;
            patch?: never;
            trace?: never;
        };
    }
    type webhooks = Record<string, never>;
    interface components {
        schemas: never;
        responses: never;
        parameters: never;
        requestBodies: never;
        headers: never;
        pathItems: never;
    }
    type $defs = Record<string, never>;
    type operations = Record<string, never>;
}

// Types from Connectors.yaml
export namespace Connectors {
    interface paths {
        "/api/connectors/v1/list": {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            /**
             * List Connectors
             * @remarks Returns a list of connectors.
             */
            get: {
                parameters: {
                    query?: never;
                    header?: never;
                    path?: never;
                    cookie?: never;
                };
                requestBody?: never;
                responses: {
                    /** @remarks List of connectors */
                    200: {
                        headers: {
                            [name: string]: unknown;
                        };
                        content: {
                            /** @example {
                             *       "connectors": []
                             *     } */
                            "application/json": unknown;
                        };
                    };
                };
            };
            put?: never;
            post?: never;
            delete?: never;
            options?: never;
            head?: never;
            patch?: never;
            trace?: never;
        };
    }
    type webhooks = Record<string, never>;
    interface components {
        schemas: never;
        responses: never;
        parameters: never;
        requestBodies: never;
        headers: never;
        pathItems: never;
    }
    type $defs = Record<string, never>;
    type operations = Record<string, never>;
}

// Types from Data-Accounts-API.yaml
export namespace Data_Accounts_API {
    interface paths {
        "/api/data/v1/accounts/{account_id}": {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            /** GET Account by ID */
            get: {
                parameters: {
                    query?: never;
                    header?: never;
                    path?: never;
                    cookie?: never;
                };
                requestBody?: never;
                responses: {
                    200: {
                        headers: {
                            [name: string]: unknown;
                        };
                        content: {
                            /** @example HTTP/1.1 200 OK Content-Type: application/json;charset=UTF-8 { "accountId": "{account\_id}", "displayName": "Account Display Name", "status": "Active" }
                             *      */
                            "application/json": unknown;
                        };
                    };
                };
            };
            put?: never;
            post?: never;
            delete?: never;
            options?: never;
            head?: never;
            patch?: never;
            trace?: never;
        };
        "/api/data/v1/accounts/": {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            /** GET all accounts */
            get: {
                parameters: {
                    query?: never;
                    header?: never;
                    path?: never;
                    cookie?: never;
                };
                requestBody?: never;
                responses: {
                    200: {
                        headers: {
                            [name: string]: unknown;
                        };
                        content: {
                            /** @example HTTP/1.1 200 OK Content-Type: application/json;charset=UTF-8 [ { "accountId": "{account\_id}", "displayName": "Account 1" }, { "accountId": "{account\_id}", "displayName": "Account 2" } ]
                             *      */
                            "application/json": unknown;
                        };
                    };
                };
            };
            put?: never;
            post?: never;
            delete?: never;
            options?: never;
            head?: never;
            patch?: never;
            trace?: never;
        };
        "/api/search/v1/query": {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            get?: never;
            put?: never;
            /** Search Accounts by Name */
            post: {
                parameters: {
                    query?: never;
                    header?: never;
                    path?: never;
                    cookie?: never;
                };
                requestBody?: never;
                responses: {
                    200: {
                        headers: {
                            [name: string]: unknown;
                        };
                        content: {
                            /** @example HTTP/1.1 200 OK Content-Type: application/json;charset=UTF-8 { "results": [ { "accountId": "{account\_id}", "displayName": "SDK Account", "status": "Active" } ] }
                             *      */
                            "application/json": unknown;
                        };
                    };
                };
            };
            delete?: never;
            options?: never;
            head?: never;
            patch?: never;
            trace?: never;
        };
        "/api/data/v1/accounts": {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            get?: never;
            put?: never;
            /** Create Account */
            post: {
                parameters: {
                    query?: never;
                    header?: never;
                    path?: never;
                    cookie?: never;
                };
                requestBody?: never;
                responses: {
                    200: {
                        headers: {
                            [name: string]: unknown;
                        };
                        content: {
                            /** @example HTTP/1.1 200 OK Content-Type: application/json;charset=UTF-8 { "accountId": "{account\_id}", "displayName": "New Account", "status": "Active" }
                             *      */
                            "application/json": unknown;
                        };
                    };
                };
            };
            delete?: never;
            options?: never;
            head?: never;
            patch?: never;
            trace?: never;
        };
        "/api/data-accounts/v1/list": {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            /**
             * List Data Accounts
             * @remarks Returns a list of data accounts.
             */
            get: {
                parameters: {
                    query?: never;
                    header?: never;
                    path?: never;
                    cookie?: never;
                };
                requestBody?: never;
                responses: {
                    /** @remarks List of data accounts */
                    200: {
                        headers: {
                            [name: string]: unknown;
                        };
                        content: {
                            /** @example {
                             *       "accounts": []
                             *     } */
                            "application/json": unknown;
                        };
                    };
                };
            };
            put?: never;
            post?: never;
            delete?: never;
            options?: never;
            head?: never;
            patch?: never;
            trace?: never;
        };
    }
    type webhooks = Record<string, never>;
    interface components {
        schemas: never;
        responses: never;
        parameters: never;
        requestBodies: never;
        headers: never;
        pathItems: never;
    }
    type $defs = Record<string, never>;
    type operations = Record<string, never>;
}

// Types from DataSet-Schema-API.yaml
export namespace DataSet_Schema_API {
    interface paths {
        "/api/data/v2/datasources/{DATASET_ID}/schemas/latest": {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            /**
             * Get schema for a specified Dataset
             * @remarks Returns the schema for a specified Dataset.
             */
            get: {
                parameters: {
                    query?: never;
                    header?: never;
                    path: {
                        DATASET_ID: string;
                    };
                    cookie?: never;
                };
                requestBody?: never;
                responses: {
                    /** @remarks Schema response */
                    200: {
                        headers: {
                            [name: string]: unknown;
                        };
                        content: {
                            /** @example {
                             *       "schema": {
                             *         "columns": [
                             *           {
                             *             "type": "<TYPE>",
                             *             "name": "<NAME>",
                             *             "id": "<ID>",
                             *             "visible": true,
                             *             "metadata": {
                             *               "colLabel": "<LABEL>",
                             *               "colFormat": "",
                             *               "isEncrypted": false
                             *             }
                             *           }
                             *         ]
                             *       }
                             *     } */
                            "application/json": unknown;
                        };
                    };
                };
            };
            put?: never;
            post?: never;
            delete?: never;
            options?: never;
            head?: never;
            patch?: never;
            trace?: never;
        };
    }
    type webhooks = Record<string, never>;
    interface components {
        schemas: never;
        responses: never;
        parameters: never;
        requestBodies: never;
        headers: never;
        pathItems: never;
    }
    type $defs = Record<string, never>;
    type operations = Record<string, never>;
}

// Types from Federated-V2-to-Amplifier-Migration-APIs.yaml
export namespace Federated_V2_to_Amplifier_Migration_APIs {
    interface paths {
        "/api/federated/v2/migrate": {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            get?: never;
            put?: never;
            /**
             * Federated V2 to Amplifier Migration
             * @remarks Migrates data from Federated V2 to Amplifier.
             */
            post: {
                parameters: {
                    query?: never;
                    header?: never;
                    path?: never;
                    cookie?: never;
                };
                requestBody: {
                    content: {
                        "application/json": Record<string, never>;
                    };
                };
                responses: {
                    /** @remarks Migration response */
                    200: {
                        headers: {
                            [name: string]: unknown;
                        };
                        content: {
                            /** @example {
                             *       "migrated": true
                             *     } */
                            "application/json": unknown;
                        };
                    };
                };
            };
            delete?: never;
            options?: never;
            head?: never;
            patch?: never;
            trace?: never;
        };
    }
    type webhooks = Record<string, never>;
    interface components {
        schemas: never;
        responses: never;
        parameters: never;
        requestBodies: never;
        headers: never;
        pathItems: never;
    }
    type $defs = Record<string, never>;
    type operations = Record<string, never>;
}

// Types from Files-API.yaml
export namespace Files_API {
    interface paths {
        "/api/files/v1/list": {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            /**
             * List Files
             * @remarks Returns a list of files.
             */
            get: {
                parameters: {
                    query?: never;
                    header?: never;
                    path?: never;
                    cookie?: never;
                };
                requestBody?: never;
                responses: {
                    /** @remarks List of files */
                    200: {
                        headers: {
                            [name: string]: unknown;
                        };
                        content: {
                            /** @example {
                             *       "files": []
                             *     } */
                            "application/json": unknown;
                        };
                    };
                };
            };
            put?: never;
            post?: never;
            delete?: never;
            options?: never;
            head?: never;
            patch?: never;
            trace?: never;
        };
        "/api/files/v1/upload": {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            get?: never;
            put?: never;
            /**
             * Upload File
             * @remarks Uploads a file.
             */
            post: {
                parameters: {
                    query?: never;
                    header?: never;
                    path?: never;
                    cookie?: never;
                };
                requestBody: {
                    content: {
                        "multipart/form-data": {
                            /** Format: binary */
                            file?: string;
                        };
                    };
                };
                responses: {
                    /** @remarks Upload response */
                    200: {
                        headers: {
                            [name: string]: unknown;
                        };
                        content: {
                            /** @example {
                             *       "success": true
                             *     } */
                            "application/json": unknown;
                        };
                    };
                };
            };
            delete?: never;
            options?: never;
            head?: never;
            patch?: never;
            trace?: never;
        };
    }
    type webhooks = Record<string, never>;
    interface components {
        schemas: never;
        responses: never;
        parameters: never;
        requestBodies: never;
        headers: never;
        pathItems: never;
    }
    type $defs = Record<string, never>;
    type operations = Record<string, never>;
}

// Types from Managing-Dataset-History.yaml
export namespace Managing_Dataset_History {
    interface paths {
        "/api/data/v1/datasources/{DATASET_ID}/history": {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            /**
             * Get Dataset History
             * @remarks Returns the history for a specified Dataset.
             */
            get: {
                parameters: {
                    query?: never;
                    header?: never;
                    path: {
                        DATASET_ID: string;
                    };
                    cookie?: never;
                };
                requestBody?: never;
                responses: {
                    /** @remarks Dataset history response */
                    200: {
                        headers: {
                            [name: string]: unknown;
                        };
                        content: {
                            /** @example {
                             *       "history": []
                             *     } */
                            "application/json": unknown;
                        };
                    };
                };
            };
            put?: never;
            post?: never;
            delete?: never;
            options?: never;
            head?: never;
            patch?: never;
            trace?: never;
        };
    }
    type webhooks = Record<string, never>;
    interface components {
        schemas: never;
        responses: never;
        parameters: never;
        requestBodies: never;
        headers: never;
        pathItems: never;
    }
    type $defs = Record<string, never>;
    type operations = Record<string, never>;
}

// Types from Publishing-to-Other-Users.yaml
export namespace Publishing_to_Other_Users {
    interface paths {
        "/api/publishing/v1/publish": {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            get?: never;
            put?: never;
            /**
             * Publish to Other Users
             * @remarks Publishes content to other users.
             */
            post: {
                parameters: {
                    query?: never;
                    header?: never;
                    path?: never;
                    cookie?: never;
                };
                requestBody: {
                    content: {
                        "application/json": Record<string, never>;
                    };
                };
                responses: {
                    /** @remarks Publish response */
                    200: {
                        headers: {
                            [name: string]: unknown;
                        };
                        content: {
                            /** @example {
                             *       "success": true
                             *     } */
                            "application/json": unknown;
                        };
                    };
                };
            };
            delete?: never;
            options?: never;
            head?: never;
            patch?: never;
            trace?: never;
        };
    }
    type webhooks = Record<string, never>;
    interface components {
        schemas: never;
        responses: never;
        parameters: never;
        requestBodies: never;
        headers: never;
        pathItems: never;
    }
    type $defs = Record<string, never>;
    type operations = Record<string, never>;
}

// Types from Query-Dataset-API.yaml
export namespace Query_Dataset_API {
    interface paths {
        "api/query/v1/execute/export/<DATASET_ID>?includeHeader=true": {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            get?: never;
            put?: never;
            /** Query Dataset */
            post: {
                parameters: {
                    query?: never;
                    header?: never;
                    path?: never;
                    cookie?: never;
                };
                requestBody?: never;
                responses: {
                    200: {
                        headers: {
                            [name: string]: unknown;
                        };
                        content: {
                            /** @example 200:
                             *
                             *     { "datasource": "<DATASET\_ID>", "columns": [ ], "metadata": [ ], "numColumns": 10, "rows": [ ], "numRows": 15}
                             *      */
                            "application/json": unknown;
                        };
                    };
                };
            };
            delete?: never;
            options?: never;
            head?: never;
            patch?: never;
            trace?: never;
        };
    }
    type webhooks = Record<string, never>;
    interface components {
        schemas: never;
        responses: never;
        parameters: never;
        requestBodies: never;
        headers: never;
        pathItems: never;
    }
    type $defs = Record<string, never>;
    type operations = Record<string, never>;
}

// Types from Render-KPI-Card-Chart-Table.yaml
export namespace Render_KPI_Card_Chart_Table {
    interface paths {
        "/api/cards/v1/render": {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            get?: never;
            put?: never;
            /**
             * Render KPI Card/Chart/Table
             * @remarks Renders a KPI card, chart, or table.
             */
            post: {
                parameters: {
                    query?: never;
                    header?: never;
                    path?: never;
                    cookie?: never;
                };
                requestBody: {
                    content: {
                        "application/json": Record<string, never>;
                    };
                };
                responses: {
                    /** @remarks Render response */
                    200: {
                        headers: {
                            [name: string]: unknown;
                        };
                        content: {
                            /** @example {
                             *       "rendered": true
                             *     } */
                            "application/json": unknown;
                        };
                    };
                };
            };
            delete?: never;
            options?: never;
            head?: never;
            patch?: never;
            trace?: never;
        };
    }
    type webhooks = Record<string, never>;
    interface components {
        schemas: never;
        responses: never;
        parameters: never;
        requestBodies: never;
        headers: never;
        pathItems: never;
    }
    type $defs = Record<string, never>;
    type operations = Record<string, never>;
}

// Types from Roles-Governance-API.yaml
export namespace Roles_Governance_API {
    interface paths {
        "/api/roles/v1/list": {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            /**
             * List Roles
             * @remarks Returns a list of roles.
             */
            get: {
                parameters: {
                    query?: never;
                    header?: never;
                    path?: never;
                    cookie?: never;
                };
                requestBody?: never;
                responses: {
                    /** @remarks List of roles */
                    200: {
                        headers: {
                            [name: string]: unknown;
                        };
                        content: {
                            /** @example {
                             *       "roles": []
                             *     } */
                            "application/json": unknown;
                        };
                    };
                };
            };
            put?: never;
            post?: never;
            delete?: never;
            options?: never;
            head?: never;
            patch?: never;
            trace?: never;
        };
    }
    type webhooks = Record<string, never>;
    interface components {
        schemas: never;
        responses: never;
        parameters: never;
        requestBodies: never;
        headers: never;
        pathItems: never;
    }
    type $defs = Record<string, never>;
    type operations = Record<string, never>;
}

// Types from Scheduled-Reports-API.yaml
export namespace Scheduled_Reports_API {
    interface paths {
        "/api/content/v1/reportschedules": {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            /** List Report Schedules */
            get: {
                parameters: {
                    query?: {
                        /** @remarks Sort in ascending order */
                        ""?: boolean;
                    };
                    header?: never;
                    path?: never;
                    cookie?: never;
                };
                requestBody?: never;
                responses: {
                    200: {
                        headers: {
                            [name: string]: unknown;
                        };
                        content?: never;
                    };
                };
            };
            put?: never;
            /** Create Report Schedule */
            post: {
                parameters: {
                    query?: never;
                    header?: never;
                    path?: never;
                    cookie?: never;
                };
                requestBody?: {
                    content: {
                        /** @example
                         *
                         *
                         *
                         *     1
                         *
                         *
                         *
                         *
                         *
                         *
                         *
                         *     {
                         *
                         *
                         *
                         *
                         *
                         *
                         *
                         *     2
                         *
                         *
                         *
                         *
                         *
                         *
                         *
                         *     "title": "Weekly Performance Report",
                         *
                         *
                         *
                         *
                         *
                         *
                         *
                         *     3
                         *
                         *
                         *
                         *
                         *
                         *
                         *
                         *     "pageId": 345678,
                         *
                         *
                         *
                         *
                         *
                         *
                         *
                         *     4
                         *
                         *
                         *
                         *
                         *
                         *
                         *
                         *     "viewId": 789012,
                         *
                         *
                         *
                         *
                         *
                         *
                         *
                         *     5
                         *
                         *
                         *
                         *
                         *
                         *
                         *
                         *     "schedule": {
                         *
                         *
                         *
                         *
                         *
                         *
                         *
                         *     6
                         *
                         *
                         *
                         *
                         *
                         *
                         *
                         *     "frequency": "WEEKLY",
                         *
                         *
                         *
                         *
                         *
                         *
                         *
                         *     7
                         *
                         *
                         *
                         *
                         *
                         *
                         *
                         *     "daysToRun": "MON",
                         *
                         *
                         *
                         *
                         *
                         *
                         *
                         *     8
                         *
                         *
                         *
                         *
                         *
                         *
                         *
                         *     "hourOfDay": 8,
                         *
                         *
                         *
                         *
                         *
                         *
                         *
                         *     9
                         *
                         *
                         *
                         *
                         *
                         *
                         *
                         *     "minOfHour": 0,
                         *
                         *
                         *
                         *
                         *
                         *
                         *
                         *     10
                         *
                         *
                         *
                         *
                         *
                         *
                         *
                         *     "timezone": "America/New_York",
                         *
                         *
                         *
                         *
                         *
                         *
                         *
                         *     11
                         *
                         *
                         *
                         *
                         *
                         *
                         *
                         *     "enabled": true,
                         *
                         *
                         *
                         *
                         *
                         *
                         *
                         *     12
                         *
                         *
                         *
                         *
                         *
                         *
                         *
                         *     "additionalRecipients": [
                         *
                         *
                         *
                         *
                         *
                         *
                         *
                         *     13
                         *
                         *
                         *
                         *
                         *
                         *
                         *
                         *     {
                         *
                         *
                         *
                         *
                         *
                         *
                         *
                         *     14
                         *
                         *
                         *
                         *
                         *
                         *
                         *
                         *     "type": "EMAIL",
                         *
                         *
                         *
                         *
                         *
                         *
                         *
                         *     15
                         *
                         *
                         *
                         *
                         *
                         *
                         *
                         *     "value": "user@example.com"
                         *
                         *
                         *
                         *
                         *
                         *
                         *
                         *     16
                         *
                         *
                         *
                         *
                         *
                         *
                         *
                         *     }
                         *
                         *
                         *
                         *
                         *
                         *
                         *
                         *     17
                         *
                         *
                         *
                         *
                         *
                         *
                         *
                         *     ]
                         *
                         *
                         *
                         *
                         *
                         *
                         *
                         *     18
                         *
                         *
                         *
                         *
                         *
                         *
                         *
                         *     },
                         *
                         *
                         *
                         *
                         *
                         *
                         *
                         *     19
                         *
                         *
                         *
                         *
                         *
                         *
                         *
                         *     "attachmentInclude": true
                         *
                         *
                         *
                         *
                         *
                         *
                         *
                         *     20
                         *
                         *
                         *
                         *
                         *
                         *
                         *
                         *     }
                         *
                         *
                         *
                         *
                         *      */
                        "application/json": unknown;
                    };
                };
                responses: {
                    200: {
                        headers: {
                            [name: string]: unknown;
                        };
                        content?: never;
                    };
                };
            };
            /** Delete Report Schedule by Page ID */
            delete: {
                parameters: {
                    query?: {
                        /** @remarks ID of the page to delete schedule for */
                        ""?: number;
                    };
                    header?: never;
                    path?: never;
                    cookie?: never;
                };
                requestBody?: never;
                responses: {
                    200: {
                        headers: {
                            [name: string]: unknown;
                        };
                        content?: never;
                    };
                };
            };
            options?: never;
            head?: never;
            patch?: never;
            trace?: never;
        };
        "/api/content/v1/reportschedules/{scheduleId}": {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            /** Get Report Schedule by ID */
            get: {
                parameters: {
                    query?: never;
                    header?: never;
                    path: {
                        /** @remarks ID of the schedule to retrieve */
                        "": number;
                    };
                    cookie?: never;
                };
                requestBody?: never;
                responses: {
                    200: {
                        headers: {
                            [name: string]: unknown;
                        };
                        content?: never;
                    };
                };
            };
            /** Update Report Schedule */
            put: {
                parameters: {
                    query?: never;
                    header?: never;
                    path: {
                        /** @remarks ID of the schedule to update */
                        "": number;
                    };
                    cookie?: never;
                };
                requestBody?: {
                    content: {
                        /** @example
                         *
                         *
                         *
                         *     1
                         *
                         *
                         *
                         *
                         *
                         *
                         *
                         *     {
                         *
                         *
                         *
                         *
                         *
                         *
                         *
                         *     2
                         *
                         *
                         *
                         *
                         *
                         *
                         *
                         *     "title": "Updated Monthly Sales Report",
                         *
                         *
                         *
                         *
                         *
                         *
                         *
                         *     3
                         *
                         *
                         *
                         *
                         *
                         *
                         *
                         *     "schedule": {
                         *
                         *
                         *
                         *
                         *
                         *
                         *
                         *     4
                         *
                         *
                         *
                         *
                         *
                         *
                         *
                         *     "frequency": "MONTHLY",
                         *
                         *
                         *
                         *
                         *
                         *
                         *
                         *     5
                         *
                         *
                         *
                         *
                         *
                         *
                         *
                         *     "daysToRun": "15",
                         *
                         *
                         *
                         *
                         *
                         *
                         *
                         *     6
                         *
                         *
                         *
                         *
                         *
                         *
                         *
                         *     "hourOfDay": 10,
                         *
                         *
                         *
                         *
                         *
                         *
                         *
                         *     7
                         *
                         *
                         *
                         *
                         *
                         *
                         *
                         *     "minOfHour": 30,
                         *
                         *
                         *
                         *
                         *
                         *
                         *
                         *     8
                         *
                         *
                         *
                         *
                         *
                         *
                         *
                         *     "timezone": "America/New_York",
                         *
                         *
                         *
                         *
                         *
                         *
                         *
                         *     9
                         *
                         *
                         *
                         *
                         *
                         *
                         *
                         *     "enabled": true
                         *
                         *
                         *
                         *
                         *
                         *
                         *
                         *     10
                         *
                         *
                         *
                         *
                         *
                         *
                         *
                         *     }
                         *
                         *
                         *
                         *
                         *
                         *
                         *
                         *     11
                         *
                         *
                         *
                         *
                         *
                         *
                         *
                         *     }
                         *
                         *
                         *
                         *
                         *      */
                        "application/json": unknown;
                    };
                };
                responses: {
                    200: {
                        headers: {
                            [name: string]: unknown;
                        };
                        content?: never;
                    };
                };
            };
            post?: never;
            /** Delete Report Schedule */
            delete: {
                parameters: {
                    query?: never;
                    header?: never;
                    path: {
                        /** @remarks ID of the schedule to delete */
                        "": number;
                    };
                    cookie?: never;
                };
                requestBody?: never;
                responses: {
                    200: {
                        headers: {
                            [name: string]: unknown;
                        };
                        content?: never;
                    };
                };
            };
            options?: never;
            head?: never;
            patch?: never;
            trace?: never;
        };
        "/api/content/v1/reportschedules/{scheduleId}/enabled": {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            get?: never;
            /** Enable/Disable Report Schedule */
            put: {
                parameters: {
                    query?: never;
                    header?: never;
                    path: {
                        /** @remarks ID of the schedule */
                        "": number;
                    };
                    cookie?: never;
                };
                requestBody?: {
                    content: {
                        /** @example
                         *
                         *
                         *
                         *     1
                         *
                         *
                         *
                         *
                         *
                         *
                         *
                         *     true
                         *
                         *
                         *
                         *
                         *      */
                        "application/json": unknown;
                    };
                };
                responses: {
                    200: {
                        headers: {
                            [name: string]: unknown;
                        };
                        content?: never;
                    };
                };
            };
            post?: never;
            delete?: never;
            options?: never;
            head?: never;
            patch?: never;
            trace?: never;
        };
        "/api/content/v1/reportschedules/{scheduleId}/history": {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            /** Get Report History by Schedule ID */
            get: {
                parameters: {
                    query?: {
                        /** @remarks Number of items to skip */
                        ""?: number;
                    };
                    header?: never;
                    path: {
                        /** @remarks ID of the schedule */
                        "": number;
                    };
                    cookie?: never;
                };
                requestBody?: never;
                responses: {
                    200: {
                        headers: {
                            [name: string]: unknown;
                        };
                        content?: never;
                    };
                };
            };
            put?: never;
            post?: never;
            delete?: never;
            options?: never;
            head?: never;
            patch?: never;
            trace?: never;
        };
        "/api/content/v1/reportschedules/{scheduleId}/notifications": {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            get?: never;
            put?: never;
            /** Build and Email Report */
            post: {
                parameters: {
                    query?: never;
                    header?: never;
                    path: {
                        /** @remarks ID of the schedule */
                        "": number;
                    };
                    cookie?: never;
                };
                requestBody?: {
                    content: {
                        /** @example
                         *
                         *
                         *
                         *     1
                         *
                         *
                         *
                         *
                         *
                         *
                         *
                         *     [
                         *
                         *
                         *
                         *
                         *
                         *
                         *
                         *     2
                         *
                         *
                         *
                         *
                         *
                         *
                         *
                         *     {
                         *
                         *
                         *
                         *
                         *
                         *
                         *
                         *     3
                         *
                         *
                         *
                         *
                         *
                         *
                         *
                         *     "userId": 901234,
                         *
                         *
                         *
                         *
                         *
                         *
                         *
                         *     4
                         *
                         *
                         *
                         *
                         *
                         *
                         *
                         *     "displayName": "John Doe",
                         *
                         *
                         *
                         *
                         *
                         *
                         *
                         *     5
                         *
                         *
                         *
                         *
                         *
                         *
                         *
                         *     "emailAddress": "john.doe@example.com"
                         *
                         *
                         *
                         *
                         *
                         *
                         *
                         *     6
                         *
                         *
                         *
                         *
                         *
                         *
                         *
                         *     }
                         *
                         *
                         *
                         *
                         *
                         *
                         *
                         *     7
                         *
                         *
                         *
                         *
                         *
                         *
                         *
                         *     ]
                         *
                         *
                         *
                         *
                         *      */
                        "application/json": unknown;
                    };
                };
                responses: {
                    200: {
                        headers: {
                            [name: string]: unknown;
                        };
                        content?: never;
                    };
                };
            };
            delete?: never;
            options?: never;
            head?: never;
            patch?: never;
            trace?: never;
        };
        "/api/content/v1/reportschedules/{scheduleId}/notifications/queue": {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            get?: never;
            put?: never;
            /** Queue Build and Email Report */
            post: {
                parameters: {
                    query?: never;
                    header?: never;
                    path: {
                        /** @remarks ID of the schedule */
                        "": number;
                    };
                    cookie?: never;
                };
                requestBody?: {
                    content: {
                        /** @example
                         *
                         *
                         *
                         *     1
                         *
                         *
                         *
                         *
                         *
                         *
                         *
                         *     [
                         *
                         *
                         *
                         *
                         *
                         *
                         *
                         *     2
                         *
                         *
                         *
                         *
                         *
                         *
                         *
                         *     {
                         *
                         *
                         *
                         *
                         *
                         *
                         *
                         *     3
                         *
                         *
                         *
                         *
                         *
                         *
                         *
                         *     "userId": 901234,
                         *
                         *
                         *
                         *
                         *
                         *
                         *
                         *     4
                         *
                         *
                         *
                         *
                         *
                         *
                         *
                         *     "displayName": "John Doe",
                         *
                         *
                         *
                         *
                         *
                         *
                         *
                         *     5
                         *
                         *
                         *
                         *
                         *
                         *
                         *
                         *     "emailAddress": "john.doe@example.com"
                         *
                         *
                         *
                         *
                         *
                         *
                         *
                         *     6
                         *
                         *
                         *
                         *
                         *
                         *
                         *
                         *     }
                         *
                         *
                         *
                         *
                         *
                         *
                         *
                         *     7
                         *
                         *
                         *
                         *
                         *
                         *
                         *
                         *     ]
                         *
                         *
                         *
                         *
                         *      */
                        "application/json": unknown;
                    };
                };
                responses: {
                    200: {
                        headers: {
                            [name: string]: unknown;
                        };
                        content?: never;
                    };
                };
            };
            delete?: never;
            options?: never;
            head?: never;
            patch?: never;
            trace?: never;
        };
        "/api/content/v1/reportschedules/{scheduleId}/queue": {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            get?: never;
            put?: never;
            /** Queue Report Now */
            post: {
                parameters: {
                    query?: never;
                    header?: never;
                    path: {
                        /** @remarks ID of the schedule */
                        "": number;
                    };
                    cookie?: never;
                };
                requestBody?: {
                    content: {
                        /** @example
                         *
                         *
                         *
                         *     1
                         *
                         *
                         *
                         *
                         *
                         *
                         *
                         *     [
                         *
                         *
                         *
                         *
                         *
                         *
                         *
                         *     2
                         *
                         *
                         *
                         *
                         *
                         *
                         *
                         *     {
                         *
                         *
                         *
                         *
                         *
                         *
                         *
                         *     3
                         *
                         *
                         *
                         *
                         *
                         *
                         *
                         *     "type": "EMAIL",
                         *
                         *
                         *
                         *
                         *
                         *
                         *
                         *     4
                         *
                         *
                         *
                         *
                         *
                         *
                         *
                         *     "value": "john.doe@example.com"
                         *
                         *
                         *
                         *
                         *
                         *
                         *
                         *     5
                         *
                         *
                         *
                         *
                         *
                         *
                         *
                         *     }
                         *
                         *
                         *
                         *
                         *
                         *
                         *
                         *     6
                         *
                         *
                         *
                         *
                         *
                         *
                         *
                         *     ]
                         *
                         *
                         *
                         *
                         *      */
                        "application/json": unknown;
                    };
                };
                responses: {
                    200: {
                        headers: {
                            [name: string]: unknown;
                        };
                        content?: never;
                    };
                };
            };
            delete?: never;
            options?: never;
            head?: never;
            patch?: never;
            trace?: never;
        };
        "/api/content/v1/reportschedules/{scheduleId}/resubscribe": {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            get?: never;
            put?: never;
            /** Resubscribe to Report */
            post: {
                parameters: {
                    query?: {
                        /** @remarks Email ID */
                        ""?: string;
                    };
                    header?: never;
                    path: {
                        /** @remarks ID of the schedule */
                        "": number;
                    };
                    cookie?: never;
                };
                requestBody?: never;
                responses: {
                    200: {
                        headers: {
                            [name: string]: unknown;
                        };
                        content?: never;
                    };
                };
            };
            delete?: never;
            options?: never;
            head?: never;
            patch?: never;
            trace?: never;
        };
        "/api/content/v1/reportschedules/{scheduleId}/sendnow": {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            get?: never;
            put?: never;
            /** Send Report Now */
            post: {
                parameters: {
                    query?: never;
                    header?: never;
                    path: {
                        /** @remarks ID of the schedule */
                        "": number;
                    };
                    cookie?: never;
                };
                requestBody?: {
                    content: {
                        /** @example
                         *
                         *
                         *
                         *     1
                         *
                         *
                         *
                         *
                         *
                         *
                         *
                         *     [
                         *
                         *
                         *
                         *
                         *
                         *
                         *
                         *     2
                         *
                         *
                         *
                         *
                         *
                         *
                         *
                         *     {
                         *
                         *
                         *
                         *
                         *
                         *
                         *
                         *     3
                         *
                         *
                         *
                         *
                         *
                         *
                         *
                         *     "type": "EMAIL",
                         *
                         *
                         *
                         *
                         *
                         *
                         *
                         *     4
                         *
                         *
                         *
                         *
                         *
                         *
                         *
                         *     "value": "john.doe@example.com"
                         *
                         *
                         *
                         *
                         *
                         *
                         *
                         *     5
                         *
                         *
                         *
                         *
                         *
                         *
                         *
                         *     }
                         *
                         *
                         *
                         *
                         *
                         *
                         *
                         *     6
                         *
                         *
                         *
                         *
                         *
                         *
                         *
                         *     ]
                         *
                         *
                         *
                         *
                         *      */
                        "application/json": unknown;
                    };
                };
                responses: {
                    200: {
                        headers: {
                            [name: string]: unknown;
                        };
                        content?: never;
                    };
                };
            };
            delete?: never;
            options?: never;
            head?: never;
            patch?: never;
            trace?: never;
        };
        "/api/content/v1/reportschedules/{scheduleId}/sendResubscribe": {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            get?: never;
            put?: never;
            /** Send Resubscribe Email */
            post: {
                parameters: {
                    query?: never;
                    header?: never;
                    path: {
                        /** @remarks ID of the schedule */
                        "": number;
                    };
                    cookie?: never;
                };
                requestBody?: {
                    content: {
                        /** @example
                         *
                         *
                         *
                         *     1
                         *
                         *
                         *
                         *
                         *
                         *
                         *
                         *     [
                         *
                         *
                         *
                         *
                         *
                         *
                         *
                         *     2
                         *
                         *
                         *
                         *
                         *
                         *
                         *
                         *     {
                         *
                         *
                         *
                         *
                         *
                         *
                         *
                         *     3
                         *
                         *
                         *
                         *
                         *
                         *
                         *
                         *     "type": "EMAIL",
                         *
                         *
                         *
                         *
                         *
                         *
                         *
                         *     4
                         *
                         *
                         *
                         *
                         *
                         *
                         *
                         *     "value": "john.doe@example.com"
                         *
                         *
                         *
                         *
                         *
                         *
                         *
                         *     5
                         *
                         *
                         *
                         *
                         *
                         *
                         *
                         *     }
                         *
                         *
                         *
                         *
                         *
                         *
                         *
                         *     6
                         *
                         *
                         *
                         *
                         *
                         *
                         *
                         *     ]
                         *
                         *
                         *
                         *
                         *      */
                        "application/json": unknown;
                    };
                };
                responses: {
                    200: {
                        headers: {
                            [name: string]: unknown;
                        };
                        content?: never;
                    };
                };
            };
            delete?: never;
            options?: never;
            head?: never;
            patch?: never;
            trace?: never;
        };
        "/api/content/v1/reportschedules/{scheduleId}/unsubscribe": {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            get?: never;
            put?: never;
            /** Unsubscribe from Report */
            post: {
                parameters: {
                    query?: never;
                    header?: never;
                    path: {
                        /** @remarks ID of the schedule */
                        "": number;
                    };
                    cookie?: never;
                };
                requestBody?: never;
                responses: {
                    200: {
                        headers: {
                            [name: string]: unknown;
                        };
                        content?: never;
                    };
                };
            };
            delete?: never;
            options?: never;
            head?: never;
            patch?: never;
            trace?: never;
        };
        "/api/content/v1/reportschedules/{scheduleId}/unsubscribe/recipient": {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            get?: never;
            put?: never;
            post?: never;
            /** Delete Unsubscribed Recipient */
            delete: {
                parameters: {
                    query?: {
                        /** @remarks Email ID */
                        ""?: string;
                    };
                    header?: never;
                    path: {
                        /** @remarks ID of the schedule */
                        "": number;
                    };
                    cookie?: never;
                };
                requestBody?: never;
                responses: {
                    200: {
                        headers: {
                            [name: string]: unknown;
                        };
                        content?: never;
                    };
                };
            };
            options?: never;
            head?: never;
            patch?: never;
            trace?: never;
        };
        "/api/content/v1/reportschedules/card-email-data": {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            get?: never;
            put?: never;
            /** Render Card for Email */
            post: {
                parameters: {
                    query?: never;
                    header?: never;
                    path?: never;
                    cookie?: never;
                };
                requestBody?: {
                    content: {
                        /** @example
                         *
                         *
                         *
                         *     1
                         *
                         *
                         *
                         *
                         *
                         *
                         *
                         *     [
                         *
                         *
                         *
                         *
                         *
                         *
                         *
                         *     2
                         *
                         *
                         *
                         *
                         *
                         *
                         *
                         *     123,
                         *
                         *
                         *
                         *
                         *
                         *
                         *
                         *     3
                         *
                         *
                         *
                         *
                         *
                         *
                         *
                         *     456,
                         *
                         *
                         *
                         *
                         *
                         *
                         *
                         *     4
                         *
                         *
                         *
                         *
                         *
                         *
                         *
                         *     789
                         *
                         *
                         *
                         *
                         *
                         *
                         *
                         *     5
                         *
                         *
                         *
                         *
                         *
                         *
                         *
                         *     ]
                         *
                         *
                         *
                         *
                         *      */
                        "application/json": unknown;
                    };
                };
                responses: {
                    200: {
                        headers: {
                            [name: string]: unknown;
                        };
                        content?: never;
                    };
                };
            };
            delete?: never;
            options?: never;
            head?: never;
            patch?: never;
            trace?: never;
        };
        "/api/content/v1/reportschedules/created": {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            /** Get Created Report History */
            get: {
                parameters: {
                    query?: {
                        /** @remarks Sort order */
                        ""?: boolean;
                    };
                    header?: never;
                    path?: never;
                    cookie?: never;
                };
                requestBody?: never;
                responses: {
                    200: {
                        headers: {
                            [name: string]: unknown;
                        };
                        content?: never;
                    };
                };
            };
            put?: never;
            post?: never;
            delete?: never;
            options?: never;
            head?: never;
            patch?: never;
            trace?: never;
        };
        "/api/content/v1/reportschedules/emails/enabled": {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            get?: never;
            /** Enable/Disable Scheduled Report Emails */
            put: {
                parameters: {
                    query?: never;
                    header?: never;
                    path?: never;
                    cookie?: never;
                };
                requestBody?: {
                    content: {
                        /** @example
                         *
                         *
                         *
                         *     1
                         *
                         *
                         *
                         *
                         *
                         *
                         *
                         *     true
                         *
                         *
                         *
                         *
                         *      */
                        "application/json": unknown;
                    };
                };
                responses: {
                    200: {
                        headers: {
                            [name: string]: unknown;
                        };
                        content?: never;
                    };
                };
            };
            post?: never;
            delete?: never;
            options?: never;
            head?: never;
            patch?: never;
            trace?: never;
        };
        "/api/content/v1/reportschedules/extendedHistory": {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            /** Get Extended Report History */
            get: {
                parameters: {
                    query?: {
                        /** @remarks Sort order */
                        ""?: boolean;
                    };
                    header?: never;
                    path?: never;
                    cookie?: never;
                };
                requestBody?: never;
                responses: {
                    200: {
                        headers: {
                            [name: string]: unknown;
                        };
                        content?: never;
                    };
                };
            };
            put?: never;
            post?: never;
            delete?: never;
            options?: never;
            head?: never;
            patch?: never;
            trace?: never;
        };
        "/api/content/v1/reportschedules/failures/rerun": {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            get?: never;
            put?: never;
            /** Rerun Failed Scheduled Reports */
            post: {
                parameters: {
                    query?: {
                        /** @remarks End timestamp */
                        ""?: number;
                    };
                    header?: never;
                    path?: never;
                    cookie?: never;
                };
                requestBody?: never;
                responses: {
                    200: {
                        headers: {
                            [name: string]: unknown;
                        };
                        content?: never;
                    };
                };
            };
            delete?: never;
            options?: never;
            head?: never;
            patch?: never;
            trace?: never;
        };
        "/api/content/v1/reportschedules/history": {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            /** Get Report History */
            get: {
                parameters: {
                    query?: {
                        /** @remarks Include recipient information */
                        ""?: boolean;
                    };
                    header?: never;
                    path?: never;
                    cookie?: never;
                };
                requestBody?: never;
                responses: {
                    200: {
                        headers: {
                            [name: string]: unknown;
                        };
                        content?: never;
                    };
                };
            };
            put?: never;
            post?: never;
            delete?: never;
            options?: never;
            head?: never;
            patch?: never;
            trace?: never;
        };
        "/api/content/v1/reportschedules/history/{id}": {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            /** Get Report History by ID */
            get: {
                parameters: {
                    query?: never;
                    header?: never;
                    path: {
                        /** @remarks History entry ID */
                        "": number;
                    };
                    cookie?: never;
                };
                requestBody?: never;
                responses: {
                    200: {
                        headers: {
                            [name: string]: unknown;
                        };
                        content?: never;
                    };
                };
            };
            put?: never;
            post?: never;
            delete?: never;
            options?: never;
            head?: never;
            patch?: never;
            trace?: never;
        };
        "/api/content/v1/reportschedules/history/search": {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            get?: never;
            put?: never;
            /** Search Report History */
            post: {
                parameters: {
                    query?: {
                        /** @remarks Sort order */
                        ""?: boolean;
                    };
                    header?: never;
                    path?: never;
                    cookie?: never;
                };
                requestBody?: {
                    content: {
                        /** @example
                         *
                         *
                         *
                         *     1
                         *
                         *
                         *
                         *
                         *
                         *
                         *
                         *     {
                         *
                         *
                         *
                         *
                         *
                         *
                         *
                         *     2
                         *
                         *
                         *
                         *
                         *
                         *
                         *
                         *     "includeTitleClause": true,
                         *
                         *
                         *
                         *
                         *
                         *
                         *
                         *     3
                         *
                         *
                         *
                         *
                         *
                         *
                         *
                         *     "titleSearchText": "Sales",
                         *
                         *
                         *
                         *
                         *
                         *
                         *
                         *     4
                         *
                         *
                         *
                         *
                         *
                         *
                         *
                         *     "includeStatusClause": true,
                         *
                         *
                         *
                         *
                         *
                         *
                         *
                         *     5
                         *
                         *
                         *
                         *
                         *
                         *
                         *
                         *     "status": "success",
                         *
                         *
                         *
                         *
                         *
                         *
                         *
                         *     6
                         *
                         *
                         *
                         *
                         *
                         *
                         *
                         *     "includeTypeClause": true,
                         *
                         *
                         *
                         *
                         *
                         *
                         *
                         *     7
                         *
                         *
                         *
                         *
                         *
                         *
                         *
                         *     "isAutomated": true,
                         *
                         *
                         *
                         *
                         *
                         *
                         *
                         *     8
                         *
                         *
                         *
                         *
                         *
                         *
                         *
                         *     "includeScheduleIdClause": false
                         *
                         *
                         *
                         *
                         *
                         *
                         *
                         *     9
                         *
                         *
                         *
                         *
                         *
                         *
                         *
                         *     }
                         *
                         *
                         *
                         *
                         *      */
                        "application/json": unknown;
                    };
                };
                responses: {
                    200: {
                        headers: {
                            [name: string]: unknown;
                        };
                        content?: never;
                    };
                };
            };
            delete?: never;
            options?: never;
            head?: never;
            patch?: never;
            trace?: never;
        };
        "/api/content/v1/reportschedules/misconfigured": {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            /** Get Misconfigured Reports */
            get: {
                parameters: {
                    query?: {
                        /** @remarks Number of items to skip */
                        ""?: number;
                    };
                    header?: never;
                    path?: never;
                    cookie?: never;
                };
                requestBody?: never;
                responses: {
                    200: {
                        headers: {
                            [name: string]: unknown;
                        };
                        content?: never;
                    };
                };
            };
            put?: never;
            post?: never;
            delete?: never;
            options?: never;
            head?: never;
            patch?: never;
            trace?: never;
        };
        "/api/content/v1/reportschedules/resources": {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            /** Get Resources with Reports */
            get: {
                parameters: {
                    query?: {
                        /** @remarks Filter by title */
                        ""?: string;
                    };
                    header?: never;
                    path?: never;
                    cookie?: never;
                };
                requestBody?: never;
                responses: {
                    200: {
                        headers: {
                            [name: string]: unknown;
                        };
                        content?: never;
                    };
                };
            };
            put?: never;
            post?: never;
            delete?: never;
            options?: never;
            head?: never;
            patch?: never;
            trace?: never;
        };
        "/api/content/v1/reportschedules/resources/{resourceType}/{resourceId}": {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            /** Get Report Schedules by Resource ID */
            get: {
                parameters: {
                    query?: {
                        /** @remarks Show all schedules */
                        ""?: boolean;
                    };
                    header?: never;
                    path: {
                        /** @remarks ID of the resource */
                        "": number;
                    };
                    cookie?: never;
                };
                requestBody?: never;
                responses: {
                    200: {
                        headers: {
                            [name: string]: unknown;
                        };
                        content?: never;
                    };
                };
            };
            put?: never;
            post?: never;
            delete?: never;
            options?: never;
            head?: never;
            patch?: never;
            trace?: never;
        };
        "/api/content/v1/reportschedules/sortby": {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            /** Get Report Schedules Map */
            get: {
                parameters: {
                    query?: {
                        /** @remarks Sort order */
                        ""?: boolean;
                    };
                    header?: never;
                    path?: never;
                    cookie?: never;
                };
                requestBody?: never;
                responses: {
                    200: {
                        headers: {
                            [name: string]: unknown;
                        };
                        content?: never;
                    };
                };
            };
            put?: never;
            post?: never;
            delete?: never;
            options?: never;
            head?: never;
            patch?: never;
            trace?: never;
        };
        "/api/content/v1/reportschedules/views/{viewId}": {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            /** Get Report Schedule by View ID */
            get: {
                parameters: {
                    query?: never;
                    header?: never;
                    path: {
                        /** @remarks ID of the view */
                        "": number;
                    };
                    cookie?: never;
                };
                requestBody?: never;
                responses: {
                    200: {
                        headers: {
                            [name: string]: unknown;
                        };
                        content?: never;
                    };
                };
            };
            put?: never;
            post?: never;
            delete?: never;
            options?: never;
            head?: never;
            patch?: never;
            trace?: never;
        };
        "/api/content/v1/reportschedules/views/{viewId}/sendNow": {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            get?: never;
            put?: never;
            /** Send Report Now by View ID */
            post: {
                parameters: {
                    query?: {
                        /** @remarks Include attachments */
                        ""?: boolean;
                    };
                    header?: never;
                    path: {
                        /** @remarks ID of the view */
                        "": number;
                    };
                    cookie?: never;
                };
                requestBody?: {
                    content: {
                        /** @example
                         *
                         *
                         *
                         *     1
                         *
                         *
                         *
                         *
                         *
                         *
                         *
                         *     [
                         *
                         *
                         *
                         *
                         *
                         *
                         *
                         *     2
                         *
                         *
                         *
                         *
                         *
                         *
                         *
                         *     {
                         *
                         *
                         *
                         *
                         *
                         *
                         *
                         *     3
                         *
                         *
                         *
                         *
                         *
                         *
                         *
                         *     "type": "EMAIL",
                         *
                         *
                         *
                         *
                         *
                         *
                         *
                         *     4
                         *
                         *
                         *
                         *
                         *
                         *
                         *
                         *     "value": "user@example.com"
                         *
                         *
                         *
                         *
                         *
                         *
                         *
                         *     5
                         *
                         *
                         *
                         *
                         *
                         *
                         *
                         *     }
                         *
                         *
                         *
                         *
                         *
                         *
                         *
                         *     6
                         *
                         *
                         *
                         *
                         *
                         *
                         *
                         *     ]
                         *
                         *
                         *
                         *
                         *      */
                        "application/json": unknown;
                    };
                };
                responses: {
                    200: {
                        headers: {
                            [name: string]: unknown;
                        };
                        content?: never;
                    };
                };
            };
            delete?: never;
            options?: never;
            head?: never;
            patch?: never;
            trace?: never;
        };
        "/api/content/v1/reportschedules/views/{viewId}/sendNowWithParams": {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            get?: never;
            put?: never;
            /** Send Report Now with Parameters by View ID */
            post: {
                parameters: {
                    query?: {
                        /** @remarks Include attachments */
                        ""?: boolean;
                    };
                    header?: never;
                    path: {
                        /** @remarks ID of the view */
                        "": number;
                    };
                    cookie?: never;
                };
                requestBody?: {
                    content: {
                        /** @example
                         *
                         *
                         *
                         *     1
                         *
                         *
                         *
                         *
                         *
                         *
                         *
                         *     {
                         *
                         *
                         *
                         *
                         *
                         *
                         *
                         *     2
                         *
                         *
                         *
                         *
                         *
                         *
                         *
                         *     "recipients": [
                         *
                         *
                         *
                         *
                         *
                         *
                         *
                         *     3
                         *
                         *
                         *
                         *
                         *
                         *
                         *
                         *     {
                         *
                         *
                         *
                         *
                         *
                         *
                         *
                         *     4
                         *
                         *
                         *
                         *
                         *
                         *
                         *
                         *     "type": "EMAIL",
                         *
                         *
                         *
                         *
                         *
                         *
                         *
                         *     5
                         *
                         *
                         *
                         *
                         *
                         *
                         *
                         *     "value": "user@example.com"
                         *
                         *
                         *
                         *
                         *
                         *
                         *
                         *     6
                         *
                         *
                         *
                         *
                         *
                         *
                         *
                         *     }
                         *
                         *
                         *
                         *
                         *
                         *
                         *
                         *     7
                         *
                         *
                         *
                         *
                         *
                         *
                         *
                         *     ],
                         *
                         *
                         *
                         *
                         *
                         *
                         *
                         *     8
                         *
                         *
                         *
                         *
                         *
                         *
                         *
                         *     "alertActionId": 789012,
                         *
                         *
                         *
                         *
                         *
                         *
                         *
                         *     9
                         *
                         *
                         *
                         *
                         *
                         *
                         *
                         *     "emailParams": {
                         *
                         *
                         *
                         *
                         *
                         *
                         *
                         *     10
                         *
                         *
                         *
                         *
                         *
                         *
                         *
                         *     "param1": "value1"
                         *
                         *
                         *
                         *
                         *
                         *
                         *
                         *     11
                         *
                         *
                         *
                         *
                         *
                         *
                         *
                         *     }
                         *
                         *
                         *
                         *
                         *
                         *
                         *
                         *     12
                         *
                         *
                         *
                         *
                         *
                         *
                         *
                         *     }
                         *
                         *
                         *
                         *
                         *      */
                        "application/json": unknown;
                    };
                };
                responses: {
                    200: {
                        headers: {
                            [name: string]: unknown;
                        };
                        content?: never;
                    };
                };
            };
            delete?: never;
            options?: never;
            head?: never;
            patch?: never;
            trace?: never;
        };
        "/api/reports/v1/scheduled": {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            /**
             * List Scheduled Reports
             * @remarks Returns a list of scheduled reports.
             */
            get: {
                parameters: {
                    query?: never;
                    header?: never;
                    path?: never;
                    cookie?: never;
                };
                requestBody?: never;
                responses: {
                    /** @remarks List of scheduled reports */
                    200: {
                        headers: {
                            [name: string]: unknown;
                        };
                        content: {
                            /** @example {
                             *       "reports": []
                             *     } */
                            "application/json": unknown;
                        };
                    };
                };
            };
            put?: never;
            post?: never;
            delete?: never;
            options?: never;
            head?: never;
            patch?: never;
            trace?: never;
        };
    }
    type webhooks = Record<string, never>;
    interface components {
        schemas: never;
        responses: never;
        parameters: never;
        requestBodies: never;
        headers: never;
        pathItems: never;
    }
    type $defs = Record<string, never>;
    type operations = Record<string, never>;
}

// Types from Task-Center-API.yaml
export namespace Task_Center_API {
    interface components {
        schemas: never;
        responses: never;
        parameters: never;
        requestBodies: never;
        headers: never;
        pathItems: never;
    }
    type $defs = Record<string, never>;
    type operations = Record<string, never>;
}

// Types from Users-API.yaml
export namespace Users_API {
    interface paths {
        "/api/identity/v1/users": {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            get?: never;
            put?: never;
            /** Create User */
            post: {
                parameters: {
                    query?: never;
                    header?: never;
                    path?: never;
                    cookie?: never;
                };
                requestBody?: never;
                responses: {
                    200: {
                        headers: {
                            [name: string]: unknown;
                        };
                        content: {
                            /** @example HTTP/1.1 200 OK Content-Type: application/json;charset=UTF-8 { "attributes": [ { "key": string, "values": number|string[] }, ], "id": number, "displayName": string, "userName": string, "roleId": number, "emailAddress": string }
                             *      */
                            "application/json": unknown;
                        };
                    };
                };
            };
            delete?: never;
            options?: never;
            head?: never;
            patch?: never;
            trace?: never;
        };
        "/api/identity/v1/users/{id}": {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            /** Get User By Id */
            get: {
                parameters: {
                    query?: never;
                    header?: never;
                    path?: never;
                    cookie?: never;
                };
                requestBody?: never;
                responses: {
                    200: {
                        headers: {
                            [name: string]: unknown;
                        };
                        content?: never;
                    };
                };
            };
            put?: never;
            post?: never;
            delete?: never;
            options?: never;
            head?: never;
            patch?: never;
            trace?: never;
        };
        "/api/users/v1/list": {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            /**
             * List Users
             * @remarks Returns a list of users.
             */
            get: {
                parameters: {
                    query?: never;
                    header?: never;
                    path?: never;
                    cookie?: never;
                };
                requestBody?: never;
                responses: {
                    /** @remarks List of users */
                    200: {
                        headers: {
                            [name: string]: unknown;
                        };
                        content: {
                            /** @example {
                             *       "users": []
                             *     } */
                            "application/json": unknown;
                        };
                    };
                };
            };
            put?: never;
            post?: never;
            delete?: never;
            options?: never;
            head?: never;
            patch?: never;
            trace?: never;
        };
    }
    type webhooks = Record<string, never>;
    interface components {
        schemas: never;
        responses: never;
        parameters: never;
        requestBodies: never;
        headers: never;
        pathItems: never;
    }
    type $defs = Record<string, never>;
    type operations = Record<string, never>;
}

// Types from Workflows-Product-API.yaml
export namespace Workflows_Product_API {
    interface paths {
        "/api/workflows/v1/list": {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            /**
             * List Workflows
             * @remarks Returns a list of workflows.
             */
            get: {
                parameters: {
                    query?: never;
                    header?: never;
                    path?: never;
                    cookie?: never;
                };
                requestBody?: never;
                responses: {
                    /** @remarks List of workflows */
                    200: {
                        headers: {
                            [name: string]: unknown;
                        };
                        content: {
                            /** @example {
                             *       "workflows": []
                             *     } */
                            "application/json": unknown;
                        };
                    };
                };
            };
            put?: never;
            post?: never;
            delete?: never;
            options?: never;
            head?: never;
            patch?: never;
            trace?: never;
        };
    }
    type webhooks = Record<string, never>;
    interface components {
        schemas: never;
        responses: never;
        parameters: never;
        requestBodies: never;
        headers: never;
        pathItems: never;
    }
    type $defs = Record<string, never>;
    type operations = Record<string, never>;
}
