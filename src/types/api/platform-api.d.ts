/**
 * Generated API types for Domo platform APIs
 * Auto-generated, do not modify manually
 */

// Types from API-Authentication.yaml
export namespace API_Authentication {
    interface paths {
        "/oauth/token": {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            /**
             * Get Access Token
             * @remarks To interact with Domo’s APIs through OAuth security, you will need to obtain authorization and authentication. In order to access Domo APIs, a user must first be authenticated (prove that they are whom they say they are) through a client ID and client secret.
             *
             *     Once a user has been authenticated, they can then create an access token to authorize what the scope of functionality will be available for each API for that specific access token.
             *
             *     In the Basic Auth paradigm, your `client_id` will serve as the `username` and your `client_secret` will be the `password`
             */
            get: {
                parameters: {
                    query: {
                        /**
                         * @remarks The type of access token you are requesting.
                         * @example client_credentials
                         */
                        grant_type: string;
                        /** @remarks Allows you specify a subset of the Client's granted scopes to limit which parts of the API access tokens may interact with. The value is a space separated list of strings containing any of the following scopes: account, audit, buzz, dashboard, data, and user. */
                        scope?: string;
                    };
                    header?: never;
                    path?: never;
                    cookie?: never;
                };
                requestBody?: never;
                responses: {
                    /** @remarks OK */
                    200: {
                        headers: {
                            Server?: string;
                            Date?: string;
                            "Content-Type"?: string;
                            "Transfer-Encoding"?: string;
                            Connection?: string;
                            Vary?: string;
                            "Cache-Control"?: string;
                            Pragma?: string;
                            "X-Content-Type-Options"?: string;
                            "X-XSS-Protection"?: string;
                            "X-Frame-Options"?: string;
                            "Content-Encoding"?: string;
                            "Strict-Transport-Security"?: string;
                            [name: string]: unknown;
                        };
                        content: {
                            "application/json": {
                                access_token?: string;
                                customer?: string;
                                expires_in?: number;
                                jti?: string;
                                role?: string;
                                scope?: string;
                                token_type?: string;
                                userId?: number;
                            };
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

// Types from Card-API.yaml
export namespace Card_API {
    interface paths {
        "/v1/cards": {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            /**
             * List Cards
             * @remarks Get a list of Cards for which the user has permission. Use `limit` in conjunction with `offset` for pagination.
             */
            get: operations["listCards"];
            put?: never;
            post?: never;
            delete?: never;
            options?: never;
            head?: never;
            patch?: never;
            trace?: never;
        };
        "/v1/cards/{cardUrn}": {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            /**
             * Get Card
             * @remarks Retrieves a Card
             */
            get: operations["getCard"];
            put?: never;
            post?: never;
            delete?: never;
            options?: never;
            head?: never;
            patch?: never;
            trace?: never;
        };
        "/v1/cards/chart": {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            get?: never;
            put?: never;
            /**
             * Create Chart Card
             * @remarks Create a new Card to visualize data from an existing DataSet.
             */
            post: operations["createChartCard"];
            delete?: never;
            options?: never;
            head?: never;
            patch?: never;
            trace?: never;
        };
        "/v1/cards/chart/{cardUrn}": {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            /**
             * Get Chart Card Definition
             * @remarks Retrieves the definition for an existing chart Card.
             */
            get: operations["getCardDefinition"];
            /**
             * Update Chart Card Definition
             * @remarks Updates definition of an existing chart Card.
             */
            put: operations["updateChartCardDefinition"];
            post?: never;
            delete?: never;
            options?: never;
            head?: never;
            patch?: never;
            trace?: never;
        };
        "/v1/cards/chart/{cardUrn}/drill": {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            get?: never;
            put?: never;
            /**
             * Add Drill View
             * @remarks Adds a new drill view definition to an existing Card.
             */
            post: operations["addDrillView"];
            delete?: never;
            options?: never;
            head?: never;
            patch?: never;
            trace?: never;
        };
        "/v1/cards/chart/{cardUrn}/drillpath": {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            /**
             * Get Drill Properties
             * @remarks Retrieves drill views of a Card.
             */
            get: operations["getDrillProperties"];
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
        schemas: {
            CardSummaryList: {
                cards?: components["schemas"]["CardSummary"][] | null;
                /** Format: int64 */
                totalCardCount?: number | null;
            };
            CardSummary: {
                cardTitle?: string | null;
                cardUrn?: string | null;
                /** Format: int64 */
                lastModified?: number | null;
                /** Format: int64 */
                ownerId?: number | null;
                ownerName?: string | null;
                pages?: number[] | null;
                type?: string | null;
            };
            CardDefinition: {
                calculatedFields?:
                    | components["schemas"]["CalculatedField"][]
                    | null;
                chartBody?: components["schemas"]["Component_Nullable"];
                chartType?: string | null;
                chartVersion?: string | null;
                conditionalFormats?:
                    | components["schemas"]["ConditionalFormat"][]
                    | null;
                dataSetId?: string | null;
                description?: string | null;
                /** Format: double */
                goal?: number | null;
                metadataOverrides?: {
                    [key: string]: string;
                } | null;
                /** Format: float */
                preferredFullHeight?: number | null;
                /** Format: float */
                preferredFullWidth?: number | null;
                quickFilters?: components["schemas"]["QuickFilter"][] | null;
                summaryNumber?: components["schemas"]["Component_Nullable"];
                title?: string | null;
                urn?: string | null;
            };
            CalculatedField: {
                formula?: string | null;
                id?: string | null;
                name?: string | null;
                saveToDataSet?: boolean | null;
            };
            Component_Nullable: components["schemas"]["Component"] | null;
            Component: {
                columns?: components["schemas"]["DataSetColumn"][] | null;
                dateGrain?: components["schemas"]["DateGrain_Nullable"];
                dateRangeFilter?: components["schemas"]["DateRangeFilter_Nullable"];
                distinct?: boolean | null;
                filters?: components["schemas"]["Filter"][] | null;
                fiscal?: boolean | null;
                groupBy?: components["schemas"]["DataSetColumn"][] | null;
                /** Format: int64 */
                limit?: number | null;
                /** Format: int64 */
                offset?: number | null;
                orderBy?: components["schemas"]["DataSetColumn"][] | null;
                projection?: boolean | null;
            };
            DataSetColumn: {
                aggregation?: string | null;
                alias?: string | null;
                calendar?: boolean | null;
                column?: string | null;
                format?: components["schemas"]["ColumnFormat_Nullable"];
                mapping?: string | null;
                /** @enum {string|null} */
                order?: "ASCENDING" | "DESCENDING" | null;
            };
            ColumnFormat_Nullable: components["schemas"]["ColumnFormat"] | null;
            ColumnFormat: {
                alignment?: string | null;
                commas?: boolean | null;
                currency?: string | null;
                dateFormat?: string | null;
                format?: string | null;
                percent?: boolean | null;
                percentMultiplied?: boolean | null;
                /** Format: int32 */
                precision?: number | null;
                style?: string | null;
                tableColumn?: components["schemas"]["TableColumn_Nullable"];
                type?: string | null;
            };
            TableColumn_Nullable: components["schemas"]["TableColumn"] | null;
            TableColumn: {
                aggregation?: string | null;
                hideSubtotal?: boolean | null;
                hideTotal?: boolean | null;
                percentOfTotal?: boolean | null;
                /** Format: int32 */
                width?: number | null;
            };
            DateGrain_Nullable: components["schemas"]["DateGrain"] | null;
            DateGrain: {
                column?: string | null;
                dateTimeElement?: string | null;
            };
            DateRangeFilter_Nullable: Omit<
                components["schemas"]["DateRangeFilter"],
                "filterType"
            > | null;
            DateRangeFilter: {
                filterType: "DateRangeFilter";
            } & (Omit<components["schemas"]["QueryFilter"], "filterType"> & {
                field?: string | null;
                /** Format: int64 */
                from?: number | null;
                not?: boolean | null;
                /** Format: int64 */
                to?: number | null;
            });
            QueryFilter: {
                filterType: string;
            };
            Filter: {
                column?: string | null;
                operand?: string | null;
                values?: string[] | null;
            };
            ConditionalFormat: {
                condition?: components["schemas"]["Filter_Nullable"];
                format?: components["schemas"]["Format_Nullable"];
                savedToDataSet?: boolean | null;
            };
            Filter_Nullable: components["schemas"]["Filter"] | null;
            Format_Nullable: components["schemas"]["Format"] | null;
            Format: {
                applyToRow?: boolean | null;
                color?: string | null;
                textColor?: string | null;
                textStyle?: string | null;
            };
            QuickFilter: {
                column?: string | null;
                name?: string | null;
                operator?: string | null;
                type?: string | null;
                values?: string[] | null;
            };
            DrillPathProperties: {
                allowTableDrill?: boolean | null;
                drillOrder?: string[] | null;
            };
        };
        responses: never;
        parameters: never;
        requestBodies: never;
        headers: never;
        pathItems: never;
    }
    type $defs = Record<string, never>;
    interface operations {
        listCards: {
            parameters: {
                query?: {
                    /** @remarks Maximum count of Cards to be returned */
                    limit?: number;
                    /** @remarks Offset of Cards to skip before returning */
                    offset?: number;
                };
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @remarks OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "*/*": components["schemas"]["CardSummaryList"];
                    };
                };
                /** @remarks Forbidden */
                403: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
                /** @remarks Conflict */
                409: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
            };
        };
        getCard: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    /** @remarks ID of Card */
                    cardUrn: string;
                };
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @remarks OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "*/*": components["schemas"]["CardSummary"];
                    };
                };
            };
        };
        createChartCard: {
            parameters: {
                query?: {
                    /** @remarks ID of Page (Dashboard) to insert the newly created Card */
                    pageId?: number;
                };
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody: {
                content: {
                    "application/json": components["schemas"]["CardDefinition"];
                };
            };
            responses: {
                /** @remarks OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "*/*": components["schemas"]["CardDefinition"];
                    };
                };
                /** @remarks Forbidden */
                403: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
                /** @remarks Conflict */
                409: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
            };
        };
        getCardDefinition: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    /** @remarks ID of Card */
                    cardUrn: string;
                };
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @remarks OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "*/*": components["schemas"]["CardDefinition"];
                    };
                };
                /** @remarks Forbidden */
                403: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
                /** @remarks Conflict */
                409: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
            };
        };
        updateChartCardDefinition: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    /** @remarks ID of Card */
                    cardUrn: string;
                };
                cookie?: never;
            };
            requestBody: {
                content: {
                    "application/json": components["schemas"]["CardDefinition"];
                };
            };
            responses: {
                /** @remarks OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "*/*": components["schemas"]["CardDefinition"];
                    };
                };
                /** @remarks Forbidden */
                403: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
                /** @remarks Conflict */
                409: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
            };
        };
        addDrillView: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    /** @remarks ID of Card */
                    cardUrn: string;
                };
                cookie?: never;
            };
            requestBody: {
                content: {
                    "application/json": components["schemas"]["CardDefinition"];
                };
            };
            responses: {
                /** @remarks OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "*/*": components["schemas"]["CardDefinition"];
                    };
                };
                /** @remarks Forbidden */
                403: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
                /** @remarks Conflict */
                409: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
            };
        };
        getDrillProperties: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    /** @remarks ID of Card */
                    cardUrn: string;
                };
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @remarks OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "*/*": components["schemas"]["DrillPathProperties"];
                    };
                };
                /** @remarks Forbidden */
                403: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
                /** @remarks Conflict */
                409: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
            };
        };
    }
}

// Types from DataSet-API.yaml
export namespace DataSet_API {
    interface paths {
        "/v1/datasets/{dataset_id}": {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    /** @remarks The ID of the DataSet */
                    dataset_id: string;
                };
                cookie?: never;
            };
            /**
             * Retrieve DataSet Details
             * @remarks Retrieves the details of an existing DataSet.
             */
            get: {
                parameters: {
                    query?: never;
                    header?: never;
                    path: {
                        dataset_id: string;
                    };
                    cookie?: never;
                };
                requestBody?: never;
                responses: {
                    /** @remarks Returns a DataSet object if a valid `dataset_id` was provided. When requesting, if the `dataset_id` is related to a DataSet that has been deleted, a subset of the DataSet's information will be returned, including a `deleted` property, which will be `true`. */
                    200: {
                        headers: {
                            [name: string]: unknown;
                        };
                        content: {
                            "application/json": {
                                id?: string;
                                name?: string;
                                description?: string;
                                rows?: number;
                                columns?: number;
                                schema?: {
                                    columns?: {
                                        type?: string;
                                        name?: string;
                                    }[];
                                };
                                createdAt?: string;
                                updatedAt?: string;
                                pdpEnabled?: boolean;
                                policies?: {
                                    id?: number;
                                    type?: string;
                                    name?: string;
                                    filters?: {
                                        column?: string;
                                        values?: string[];
                                        operator?: string;
                                        not?: boolean;
                                    }[];
                                    users?: number[];
                                    groups?: Record<string, never>[];
                                }[];
                            };
                            "application/xml": Record<string, never>;
                        };
                    };
                };
            };
            /**
             * Update DataSet Details
             * @remarks Updates the specified DataSet’s metadata by providing values to parameters passed.
             *
             *     <!-- theme: info -->
             *     > #### Appending _Data_
             *     >
             *     > To import **additional rows** into an existing DataSet, use the [Simple API](https://developer.domo.com/portal/d984e2fec9b18-import-data-into-data-set) instead.
             *
             */
            put: {
                parameters: {
                    query?: never;
                    header?: never;
                    path: {
                        dataset_id: string;
                    };
                    cookie?: never;
                };
                requestBody?: {
                    content: {
                        "application/json": {
                            /** @remarks Name of the DataSet to update */
                            name?: string;
                            /** @remarks Description of DataSet to update */
                            description?: string;
                            pdpEnabled?: boolean;
                            /** @remarks The current schema associated with this DataSet */
                            schema?: {
                                /** @remarks Array of columns in the DataSet */
                                columns?: {
                                    /** @remarks Column name in the DataSet schema */
                                    name?: string;
                                    /** @remarks Column type in the DataSet schema. Valid types are `STRING`, `DECIMAL`, `LONG`, `DOUBLE`, `DATE`, and `DATETIME`. */
                                    type?: string;
                                }[];
                            };
                        };
                    };
                };
                responses: {
                    /** @remarks Successful response */
                    200: {
                        headers: {
                            [name: string]: unknown;
                        };
                        content: {
                            "application/json": {
                                id?: string;
                                name?: string;
                                description?: string;
                                rows?: number;
                                columns?: number;
                                schema?: {
                                    columns?: {
                                        type?: string;
                                        name?: string;
                                    }[];
                                };
                                owner?: {
                                    id?: number;
                                    name?: string;
                                };
                                createdAt?: string;
                                updatedAt?: string;
                                pdpEnabled?: boolean;
                                policies?: {
                                    id?: number;
                                    type?: string;
                                    name?: string;
                                    filters?: {
                                        column?: string;
                                        values?: string[];
                                        operator?: string;
                                        not?: boolean;
                                    }[];
                                    users?: number[];
                                    groups?: Record<string, never>[];
                                }[];
                            };
                        };
                    };
                };
            };
            post?: never;
            /**
             * Delete a DataSet
             * @remarks Permanently deletes a DataSet from your Domo instance. This can be done for all DataSets, not just those created through the API.
             *
             *     <!-- theme: danger -->
             *
             *     > #### Warning
             *     >
             *     > This is destructive and cannot be reversed.
             */
            delete: {
                parameters: {
                    query?: never;
                    header?: never;
                    path: {
                        dataset_id: string;
                    };
                    cookie?: never;
                };
                requestBody?: never;
                responses: {
                    /** @remarks Returns an empty response. */
                    204: {
                        headers: {
                            [name: string]: unknown;
                        };
                        content: {
                            "application/json": unknown;
                        };
                    };
                };
            };
            options?: never;
            head?: never;
            patch?: never;
            trace?: never;
        };
        "/v1/datasets": {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            /**
             * List DataSets
             * @remarks Get a list of all DataSets in your Domo instance.
             */
            get: {
                parameters: {
                    query?: {
                        /**
                         * @remarks The amount of DataSets to return in the list. The default is 50 and the maximum is 50.
                         * @example 3
                         */
                        limit?: number;
                        /**
                         * @remarks The offset of the DataSet ID to begin list of users within the response.
                         * @example 0
                         */
                        offset?: number;
                        /**
                         * @remarks The order to return the DataSets in.
                         * @example createdAt
                         */
                        sort?: components["schemas"]["DataSourceListOrderBy"];
                        /** @remarks If included, will limit the list of DataSets to those with names that contain the string passed in. `nameLike` is case insensitive. */
                        nameLike?: string;
                    };
                    header?: never;
                    path?: never;
                    cookie?: never;
                };
                requestBody?: never;
                responses: {
                    /** @remarks Returns all DataSet objects that meet argument criteria from original request. */
                    200: {
                        headers: {
                            [name: string]: unknown;
                        };
                        content: {
                            "application/json": {
                                id?: string;
                                name?: string;
                                rows?: number;
                                columns?: number;
                                createdAt?: string;
                                updatedAt?: string;
                                description?: string;
                            }[];
                        };
                    };
                };
            };
            put?: never;
            /**
             * Create a DataSet
             * @remarks Creates a new DataSet in your Domo instance. Once a DataSet has been created, data can be imported into the DataSet.
             */
            post: {
                parameters: {
                    query?: never;
                    header?: never;
                    path?: never;
                    cookie?: never;
                };
                requestBody?: {
                    content: {
                        "application/json": {
                            /** @remarks Name of the DataSet to create */
                            name: string;
                            /** @remarks Description of DataSet to create */
                            description?: string;
                            /** @remarks The current schema associated with this DataSet */
                            schema: {
                                /** @remarks Array of columns in the DataSet */
                                columns: {
                                    /** @remarks Column type in the DataSet schema. Valid types are `STRING`, `DECIMAL`, `LONG`, `DOUBLE`, `DATE`, and `DATETIME` */
                                    type: string;
                                    /** @remarks Column name in the DataSet schema */
                                    name: string;
                                }[];
                            };
                        };
                    };
                };
                responses: {
                    /** @remarks Returns a DataSet object when successful. The returned object will have DataSet attributes based on the information provided when the DataSet was created. */
                    201: {
                        headers: {
                            [name: string]: unknown;
                        };
                        content: {
                            "application/json": {
                                id?: string;
                                name?: string;
                                description?: string;
                                rows?: number;
                                columns?: number;
                                schema?: {
                                    columns?: {
                                        type?: string;
                                        name?: string;
                                    }[];
                                };
                                owner?: {
                                    id?: number;
                                    name?: string;
                                };
                                createdAt?: string;
                                updatedAt?: string;
                            };
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
        "/v1/datasets/query/execute/{dataset_id}": {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            get?: never;
            put?: never;
            /**
             * Query a DataSet
             * @remarks Queries the data in an existing Domo DataSet
             */
            post: {
                parameters: {
                    query?: never;
                    header?: never;
                    path: {
                        dataset_id: string;
                    };
                    cookie?: never;
                };
                requestBody?: {
                    content: {
                        "application/json": {
                            sql: string;
                        };
                    };
                };
                responses: {
                    /** @remarks Returns data from the DataSet based on your SQL query. */
                    200: {
                        headers: {
                            [name: string]: unknown;
                        };
                        content: {
                            "application/json": {
                                datasource?: string;
                                columns?: string[];
                                metadata?: {
                                    type?: string;
                                    dataSourceId?: string;
                                    maxLength?: number;
                                    minLength?: number;
                                    periodIndex?: number;
                                }[];
                                rows?: string[];
                                numRows?: number;
                                numColumns?: number;
                                fromcache?: boolean;
                            };
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
        "/v1/datasets/{dataset_id}/data": {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    /** @remarks ID of the DataSet */
                    dataset_id: string;
                };
                cookie?: never;
            };
            /**
             * Export Data from DataSet
             * @remarks Export data from a DataSet in your Domo instance.
             *
             *     > Data types will be exported as they are currently stored in the dataset. In addition, the only supported export type is CSV.
             *
             */
            get: {
                parameters: {
                    query?: {
                        /**
                         * @remarks Include table header
                         * @example true
                         */
                        includeHeader?: boolean;
                        /**
                         * @remarks The filename of the exported csv
                         * @example math-party.csv
                         */
                        fileName?: string;
                    };
                    header?: never;
                    path: {
                        dataset_id: string;
                    };
                    cookie?: never;
                };
                requestBody?: {
                    content: {
                        "*/*"?: never;
                    };
                };
                responses: {
                    /** @remarks Returns a raw CSV in the response body or error for the outcome of data being exported into DataSet. */
                    200: {
                        headers: {
                            [name: string]: unknown;
                        };
                        content: {
                            "text/csv": string;
                        };
                    };
                };
            };
            /**
             * Replace data in DataSet
             * @remarks Replace data into a DataSet in your Domo instance. This request will **replace all data** currently in the DataSet.
             *
             *     <!-- theme: info -->
             *     > #### Appending _Data_
             *     >
             *     > To import **additional rows** into a DataSet, use the [Stream API](https://developer.domo.com/portal/lw7cqi3lqufah-stream-api) instead.
             *
             */
            put: {
                parameters: {
                    query?: never;
                    header?: never;
                    path: {
                        dataset_id: string;
                    };
                    cookie?: never;
                };
                /** @remarks > The only supported content type is currently CSV format.
                 *
                 *     > To upload data in CSV format, the Domo specification used for representing data grids in CSV format closely follows the RFC standard for CSV (RFC-4180). For more details on correct CSV formatting, click here.
                 *
                 *     ```
                 *     Content-Type: text/csv
                 *
                 *     Friend,Attending
                 *     Isaac Newton,Yes
                 *     Pythagoras,No
                 *     Carl Friedrich Gauss,Yes
                 *     Ada Lovelace,Yes
                 *
                 *     ```
                 *      */
                requestBody?: {
                    content: {
                        "text/csv": unknown;
                    };
                };
                responses: {
                    /** @remarks Returns a response of success or error for the outcome of data being imported into DataSet. */
                    204: {
                        headers: {
                            [name: string]: unknown;
                        };
                        content: {
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
        "/v1/datasets/{dataset_id}/policies/{pdp_id}": {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            /**
             * Retrieve a Personalized Data Permission (PDP) policy
             * @remarks Retrieve a policy from a DataSet within Domo. A DataSet is required for a PDP policy to exist.
             */
            get: {
                parameters: {
                    query?: never;
                    header?: never;
                    path: {
                        dataset_id: string;
                        pdp_id: string;
                    };
                    cookie?: never;
                };
                requestBody?: never;
                responses: {
                    /** @remarks Returns a subset of the DataSet object specific to the data permission policy. */
                    200: {
                        headers: {
                            [name: string]: unknown;
                        };
                        content: {
                            "application/json": {
                                id?: number;
                                type?: string;
                                name?: string;
                                filters?: {
                                    column?: string;
                                    values?: string[];
                                    operator?: string;
                                    not?: boolean;
                                }[];
                                users?: number[];
                                groups?: Record<string, never>[];
                            };
                        };
                    };
                };
            };
            /**
             * Update a Personalized Data Permission (PDP) policy
             * @remarks Update the specific PDP policy for a DataSet by providing values to parameters passed.
             *
             *     > The number of characters for the list of values for a single PDP policy, including a delimiter character for each value, must be less than 255 characters.
             */
            put: {
                parameters: {
                    query?: never;
                    header?: never;
                    path: {
                        dataset_id: string;
                        pdp_id: string;
                    };
                    cookie?: never;
                };
                requestBody?: {
                    content: {
                        "application/json": {
                            name?: string;
                            filters?: {
                                /** @remarks Name of the column to filter on */
                                column?: string;
                                /** @remarks Values to filter on */
                                values?: string[];
                                /** @remarks Matching operator (EQUALS) */
                                operator?: string;
                                /** @remarks Determines if NOT is applied to the filter operation */
                                not?: boolean;
                            }[];
                            /** @remarks Type of policy (user or system) */
                            type?: string;
                            /** @remarks List of user IDs the policy applies to */
                            users?: number[];
                            /** @remarks List of group IDs the policy applies to */
                            groups?: number[];
                        };
                    };
                };
                responses: {
                    /** @remarks Returns a subset of the DataSet object specific to the data permission policy. */
                    200: {
                        headers: {
                            [name: string]: unknown;
                        };
                        content: {
                            "application/json": {
                                id?: number;
                                type?: string;
                                name?: string;
                                filters?: {
                                    column?: string;
                                    values?: string[];
                                    operator?: string;
                                    not?: boolean;
                                }[];
                                users?: number[];
                                groups?: number[];
                            };
                        };
                    };
                };
            };
            post?: never;
            /**
             * Delete a Personlized Data Permission (PDP) Policy
             * @remarks Permanently deletes a PDP policy on a DataSet in your Domo instance.
             *
             *     <!-- theme: danger -->
             *
             *     > #### Warning
             *     >
             *     > This is destructive and cannot be reversed.
             */
            delete: {
                parameters: {
                    query?: never;
                    header?: never;
                    path: {
                        dataset_id: string;
                        pdp_id: string;
                    };
                    cookie?: never;
                };
                requestBody?: never;
                responses: {
                    /** @remarks Returns a DataSet and PDP object and parameter of success or error based on whether the Personalized Data Permission (PDP) policy ID being valid. */
                    204: {
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
        "/v1/datasets/{dataset_id}/policies": {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            /**
             * List Personalized Data Permission (PDP) Policies
             * @remarks List the Personalized Data Permission (PDP) policies for a specified DataSet.
             */
            get: {
                parameters: {
                    query?: never;
                    header?: never;
                    path: {
                        dataset_id: string;
                    };
                    cookie?: never;
                };
                requestBody?: never;
                responses: {
                    /** @remarks Returns all PDP policies that are applied to the DataSet specified in request. */
                    200: {
                        headers: {
                            [name: string]: unknown;
                        };
                        content: {
                            "application/json": {
                                id?: number;
                                type?: string;
                                name?: string;
                                filters?: {
                                    column?: string;
                                    values?: string[];
                                    operator?: string;
                                    not?: boolean;
                                }[];
                                users?: number[];
                                groups?: Record<string, never>[];
                            }[];
                        };
                    };
                };
            };
            put?: never;
            /**
             * Create a Personalized Data Permission (PDP) Policy
             * @remarks Create a PDP policy for user and or group access to data within a DataSet.  Users and groups must exist before creating PDP policy.
             *
             *     > The number of characters for the list of values for a single PDP policy, including a delimiter character for each value, must be less than 255 characters.
             */
            post: {
                parameters: {
                    query?: never;
                    header?: never;
                    path: {
                        dataset_id: string;
                    };
                    cookie?: never;
                };
                requestBody?: {
                    content: {
                        "application/json": {
                            /** @remarks Name of the Policy */
                            name: string;
                            filters: {
                                /** @remarks Name of the column to filter on */
                                column: string;
                                /** @remarks Values to filter on */
                                values: string[];
                                /** @remarks Matching operator (EQUALS) */
                                operator: string;
                                /** @remarks Determines if NOT is applied to the filter operation */
                                not?: boolean;
                            }[];
                            /** @remarks List of user IDs the policy applies to */
                            users?: number[];
                            /** @remarks List of group IDs the policy applies to */
                            groups?: number[];
                            /** @remarks Type of policy (user or system) */
                            type?: string;
                        };
                    };
                };
                responses: {
                    /** @remarks Returns a subset of the DataSet object specific to the data permission policy. */
                    201: {
                        headers: {
                            [name: string]: unknown;
                        };
                        content: {
                            "application/json": {
                                id?: number;
                                type?: string;
                                name?: string;
                                filters?: {
                                    column?: string;
                                    values?: string[];
                                    operator?: string;
                                    not?: boolean;
                                }[];
                                users?: number[];
                                groups?: Record<string, never>[];
                            };
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
        schemas: {
            /** @enum {string} */
            DataSourceListOrderBy:
                | "name"
                | "nameDescending"
                | "lastTouched"
                | "lastTouchedAscending"
                | "lastUpdated"
                | "lastUpdatedAscending"
                | "createdAt"
                | "createdAtAscending"
                | "cardCount"
                | "cardCountAscending"
                | "cardViewCount"
                | "cardViewCountAscending"
                | "errorState"
                | "errorStateDescending"
                | "dataSourceId";
        };
        responses: never;
        parameters: never;
        requestBodies: never;
        headers: never;
        pathItems: never;
    }
    type $defs = Record<string, never>;
    type operations = Record<string, never>;
}

// Types from Page-API.yaml
export namespace Page_API {
    interface paths {
        "/v1/pages/{page_id}": {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    /** @remarks The ID of the page */
                    page_id: string;
                };
                cookie?: never;
            };
            /**
             * Retrieve a page
             * @remarks Retrieves the details of an existing page.
             */
            get: operations["get-v1-pages-page_id"];
            /**
             * Update a page
             * @remarks Updates the specified page by providing values to parameters passed. Any parameter left out of the request will cause the specific page’s attribute to remain unchanged.
             *
             *     > Also, collections cannot be added or removed via this endpoint, only reordered. Giving access to a user or group will also cause that user or group to have access to the parent page (if the page is a subpage). Moving a page by updating the parentId will also cause everyone with access to the page to have access to the new parent page.
             */
            put: operations["put-v1-pages-page_id"];
            post?: never;
            /**
             * Delete a page
             * @remarks Permanently deletes a page from your Domo instance.
             *
             *     <!-- theme: warning -->
             *     > #### Warning
             *     >
             *     > This is destructive and cannot be reversed.
             */
            delete: operations["delete-v1-pages-page_id"];
            options?: never;
            head?: never;
            patch?: never;
            trace?: never;
        };
        "/v1/pages": {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            /**
             * List pages
             * @remarks Get a list of all pages in your Domo instance.
             */
            get: operations["get-v1-pages"];
            put?: never;
            /**
             * Create a page
             * @remarks Creates a new page in your Domo instance.
             */
            post: operations["post-v1-pages"];
            delete?: never;
            options?: never;
            head?: never;
            patch?: never;
            trace?: never;
        };
        "/v1/pages/{page_id}/collections": {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    /** @remarks ID of page that contains the page collection */
                    page_id: string;
                };
                cookie?: never;
            };
            /** Retrieve a page collection */
            get: operations["get-v1-pages-PAGE_ID-collections"];
            put?: never;
            /** Create a page collection */
            post: {
                parameters: {
                    query?: {
                        /** @remarks Page collection's name displayed above the set of cards */
                        title?: string;
                        /** @remarks Additional text within the page collection */
                        description?: string;
                        /** @remarks 	IDs provided will add or remove cards that are not a part of a page collection */
                        cardids?: string;
                    };
                    header?: never;
                    path: {
                        /** @remarks ID of page that contains the page collection */
                        page_id: string;
                    };
                    cookie?: never;
                };
                requestBody?: {
                    content: {
                        "application/json": {
                            title?: string;
                            description?: string;
                            cardIds?: number[];
                        };
                    };
                };
                responses: {
                    /** @remarks Returns the parameter of success or error based on the page ID being valid. */
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
        "/v1/pages/{page_id}/collections/{page_collection_id}": {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    page_id: string;
                    page_collection_id: string;
                };
                cookie?: never;
            };
            get?: never;
            /** Update a page collection */
            put: operations["put-v1-pages-page_id-collections"];
            post?: never;
            /**
             * Delete a page collection
             * @remarks Permanently deletes a page collection from your Domo instance.
             *
             *     <!-- theme: warning -->
             *     > #### Warning
             *     >
             *     > This is destructive and cannot be reversed.
             *
             */
            delete: operations["delete-v1-pages-page_id-collections"];
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
    interface operations {
        "get-v1-pages-page_id": {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    /** @remarks The ID of the page */
                    page_id: string;
                };
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @remarks Returns a page object if valid page ID was provided. */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": {
                            /** @remarks The ID of the page */
                            id?: number;
                            /** @remarks The ID of the page that is higher in organizational hierarchy */
                            parentId?: number;
                            ownerId?: number;
                            /** @remarks The name of the page */
                            name?: string;
                            /** @remarks Determines whether users (besides the page owner) can make updates to page or its content - the default value is false */
                            locked?: boolean;
                            /** @remarks The IDs of collections within a page */
                            collectionIds?: Record<string, never>[];
                            /** @remarks The ID of all cards contained within the page */
                            cardIds?: number[];
                            /** @remarks Determines the access given to both individual users or groups within Domo */
                            visibility?: {
                                userIds?: number[];
                                groupIds?: Record<string, never>[];
                            };
                            /** @remarks List of IDs of page owners */
                            owners?: {
                                id?: number;
                                type?: string;
                                displayName?: string;
                            }[];
                        };
                    };
                };
            };
        };
        "put-v1-pages-page_id": {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    /** @remarks The ID of the page */
                    page_id: string;
                };
                cookie?: never;
            };
            requestBody?: {
                content: {
                    "application/json": {
                        /** @remarks ID of page that needs to be updated */
                        page_id: number;
                        /** @remarks Will update the name of the page */
                        name?: string;
                        /** @remarks If provided, will either make the page a subpage or simply move the subpage to become a child of a different parent page */
                        parentId?: number;
                        /** @remarks Will restrict access to edit page */
                        locked?: boolean;
                        /** @remarks Collections cannot be added or removed but the order can be updated based on the order of IDs provided in the argument */
                        collectionIds?: number[];
                        /** @remarks IDs provided will add or remove cards that are not a part of a page collection */
                        cardIds?: number[];
                        /** @remarks Shares pages with users or groups */
                        visibility?: {
                            /** @remarks IDs provided will share page with associated users */
                            userIds?: number[];
                            /** @remarks IDs provided will share page with associated groups */
                            groupIds?: number[];
                        };
                    };
                };
            };
            responses: {
                /** @remarks Returns the parameter of success or error based on the page ID being valid. */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
            };
        };
        "delete-v1-pages-page_id": {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    /** @remarks The ID of the page */
                    page_id: string;
                };
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @remarks Returns the parameter of success or error based on the page ID being valid. */
                204: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
            };
        };
        "get-v1-pages": {
            parameters: {
                query?: {
                    /** @remarks The amount of pages to return in the list. The default is 50 and the maximum is 500. */
                    limit?: number;
                    /** @remarks The offset of the page ID to begin list of pages within the response. */
                    offset?: number;
                };
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @remarks Returns all page objects that meet argument criteria from original request. */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": {
                            id?: number;
                            name?: string;
                            children?: {
                                id?: number;
                                name?: string;
                                children?: {
                                    id?: number;
                                    name?: string;
                                    children?: Record<string, never>[];
                                }[];
                            }[];
                        }[];
                    };
                };
            };
        };
        "post-v1-pages": {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody?: {
                content: {
                    "application/json": {
                        /** @remarks The name of the page */
                        name?: string;
                        /** @remarks If provided, the page will be created as a subpage to the page provided */
                        parentId?: number;
                        /** @remarks will restrict other users the ability to make edits to page or its content - the default value is false */
                        locked?: boolean;
                        /** @remarks The IDs of all cards to be added to the page */
                        cardIds?: number[];
                        /** @remarks Determines the access given to both individual users or groups within Domo */
                        visibility?: {
                            /** @remarks The IDs of users that will be given access to view the page */
                            userIds?: number[];
                            /** @remarks The IDs of groups that will be given access to view the page */
                            groupIds?: number[];
                        };
                    };
                };
            };
            responses: {
                /** @remarks Returns a page object when successful. */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": {
                            id?: number;
                            parentId?: number;
                            ownerId?: number;
                            name?: string;
                            locked?: boolean;
                            cardIds?: number[];
                            visibility?: {
                                userIds?: number[];
                                groupIds?: number[];
                            };
                        };
                    };
                };
            };
        };
        "get-v1-pages-PAGE_ID-collections": {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    /** @remarks ID of page that contains the page collection */
                    page_id: string;
                };
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": {
                            id?: number;
                            title?: string;
                            description?: string;
                            cardIds?: number[];
                        }[];
                    };
                };
            };
        };
        "put-v1-pages-page_id-collections": {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    page_id: string;
                    page_collection_id: string;
                };
                cookie?: never;
            };
            requestBody?: {
                content: {
                    "application/json": {
                        /** @remarks Page collection's name displayed above the set of cards */
                        title?: string;
                        /** @remarks Additional text within the page collection */
                        description?: string;
                        /** @remarks IDs provided will add or remove cards that are not a part of a page collection */
                        cardIds?: number[];
                    };
                };
            };
            responses: {
                /** @remarks Returns the parameter of success or error based on the page collection ID being valid. */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
            };
        };
        "delete-v1-pages-page_id-collections": {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    page_id: string;
                    page_collection_id: string;
                };
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @remarks Returns the parameter of success or error based on the page collection ID being valid.
                 *      */
                204: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
            };
        };
    }
}

// Types from Simple-API.yaml
export namespace Simple_API {
    interface paths {
        "/v1/json": {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            get?: never;
            put?: never;
            /**
             * Create DataSet
             * @remarks Creates a new DataSet in your Domo instance. Once the DataSet has been created, data can then be imported into the DataSet.
             */
            post: {
                parameters: {
                    query: {
                        /** @remarks Name of the DataSet to create */
                        name: string;
                        /** @remarks Description of DataSet to create */
                        description: string;
                    };
                    header?: never;
                    path?: never;
                    cookie?: never;
                };
                requestBody?: {
                    content: {
                        "application/json": {
                            name?: string;
                            description?: string;
                        };
                    };
                };
                responses: {
                    200: {
                        headers: {
                            [name: string]: unknown;
                        };
                        content: {
                            "application/json": {
                                id?: string;
                                name?: string;
                                description?: string;
                                rows?: number;
                                columns?: number;
                                owner?: {
                                    id?: number;
                                    name?: string;
                                };
                                createdAt?: string;
                                updatedAt?: string;
                            };
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
        "/v1/json/{DATASET_ID}/data": {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    /** @remarks The ID of the DataSet to have data imported */
                    DATASET_ID: string;
                };
                cookie?: never;
            };
            get?: never;
            /**
             * Import data into DataSet
             * @remarks Imports data into an already existing DataSet in your Domo instance.
             */
            put: {
                parameters: {
                    query?: never;
                    header?: never;
                    path: {
                        /** @remarks The ID of the DataSet to have data imported */
                        DATASET_ID: string;
                    };
                    cookie?: never;
                };
                requestBody?: {
                    content: {
                        "application/json": Record<string, never>;
                    };
                };
                responses: {
                    /** @remarks Returns an empty response. */
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

// Types from Stream-API.yaml
export namespace Stream_API {
    interface paths {
        "/v1/streams/{STREAM_ID}": {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    /** @remarks The ID of the Stream */
                    STREAM_ID: number;
                };
                cookie?: never;
            };
            /**
             * Retrieve a Stream
             * @remarks Retrieves the details of an existing stream.
             */
            get: {
                parameters: {
                    query?: {
                        /** @remarks Return desired fields: {all} or {id, dataset, updateMethod, createdAt, or modifiedAt} */
                        fields?: string;
                    };
                    header?: never;
                    path: {
                        /** @remarks The ID of the Stream */
                        STREAM_ID: number;
                    };
                    cookie?: never;
                };
                requestBody?: never;
                responses: {
                    /** @remarks Returns a Stream object if valid Stream ID was provided. When requesting, if the Stream ID is related to a DataSet that has been deleted, a subset of the Stream's information will be returned, including a deleted property, which will be true. */
                    200: {
                        headers: {
                            [name: string]: unknown;
                        };
                        content: {
                            "application/json": {
                                id?: number;
                                dataSet?: {
                                    id?: string;
                                    name?: string;
                                    description?: string;
                                    rows?: number;
                                    columns?: number;
                                    owner?: {
                                        id?: number;
                                        name?: string;
                                    };
                                    createdAt?: string;
                                    updatedAt?: string;
                                    pdpEnabled?: boolean;
                                };
                                updateMethod?: string;
                                createdAt?: string;
                                modifiedAt?: string;
                            };
                        };
                    };
                };
            };
            put?: never;
            post?: never;
            /**
             * Delete a Stream
             * @remarks Deletes a Stream from your Domo instance. This does not a delete the associated DataSet.
             *
             *     <!-- theme: danger -->
             *     > #### Warning
             *     >
             *     > This is destructive and cannot be reversed.
             */
            delete: {
                parameters: {
                    query?: never;
                    header?: never;
                    path: {
                        /** @remarks The ID of the Stream */
                        STREAM_ID: number;
                    };
                    cookie?: never;
                };
                requestBody?: never;
                responses: {
                    /** @remarks Returns a Stream object and parameter of success or error based on whether the Stream ID being valid. */
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
            /**
             * Update a Stream
             * @remarks Updates the specified Stream’s metadata by providing values to parameters passed.
             */
            patch: {
                parameters: {
                    query: {
                        /** @remarks The data import behavior */
                        updateMethod: string;
                    };
                    header?: never;
                    path: {
                        /** @remarks The ID of the Stream */
                        STREAM_ID: number;
                    };
                    cookie?: never;
                };
                requestBody?: {
                    content: {
                        "application/json": {
                            updateMethod?: string;
                        };
                    };
                };
                responses: {
                    /** @remarks Returns a full DataSet object of the Stream. */
                    200: {
                        headers: {
                            [name: string]: unknown;
                        };
                        content: {
                            "application/json": {
                                id?: number;
                                dataSet?: {
                                    id?: string;
                                    name?: string;
                                    description?: string;
                                    rows?: number;
                                    columns?: number;
                                    owner?: {
                                        id?: number;
                                        name?: string;
                                    };
                                    createdAt?: string;
                                    updatedAt?: string;
                                    pdpEnabled?: boolean;
                                };
                                updateMethod?: string;
                                createdAt?: string;
                                modifiedAt?: string;
                            };
                        };
                    };
                };
            };
            trace?: never;
        };
        "/v1/streams": {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            /**
             * List Streams
             * @remarks Get a list of all Streams for which the user has view permissions.
             */
            get: {
                parameters: {
                    query?: {
                        /** @remarks The amount of Stream to return in the list. The default is 50 and the maximum is 500. */
                        limit?: number;
                        /** @remarks The offset of the Stream ID to begin list of users within the response. */
                        offset?: number;
                    };
                    header?: never;
                    path?: never;
                    cookie?: never;
                };
                requestBody?: never;
                responses: {
                    /** @remarks Returns all Stream objects that meet argument criteria from original request. */
                    200: {
                        headers: {
                            [name: string]: unknown;
                        };
                        content: {
                            "application/json": {
                                id?: number;
                                dataSet?: {
                                    id?: string;
                                    pdpEnabled?: boolean;
                                };
                                updateMethod?: string;
                                createdAt?: string;
                                modifiedAt?: string;
                            }[];
                        };
                    };
                };
            };
            put?: never;
            /**
             * Create a Stream
             * @remarks When creating a Stream, specify the DataSet properties (name and description) and as a convenience, the create Stream API will create a DataSet for you.
             *
             *     Streams support both append and replace import methods, as well as Upsert. In order to create an Upsert dataset you must specify the Upsert key column(s) in keyColumnNames and set updateMethod to APPEND.
             *
             *     <!-- theme: info -->
             *     > ### Known Limitation
             *     >
             *     > The StreamAPI currently only allows you to import data to a DataSet created via the Stream API. For example, it is currently not supported to import data to a DataSet created by a Domo Connector.
             */
            post: {
                parameters: {
                    query?: never;
                    header?: never;
                    path?: never;
                    cookie?: never;
                };
                requestBody?: {
                    content: {
                        "application/json": {
                            /** @remarks The Dataset object to be created with the Stream */
                            dataSet: {
                                name?: string;
                                description?: string;
                                schema?: {
                                    columns?: {
                                        type?: string;
                                        name?: string;
                                    }[];
                                };
                            };
                            /** @remarks The data import behavior: "APPEND" or "REPLACE" */
                            updateMethod?: string;
                            /** @remarks `keyColumnNames` defines the upsert key for upsert Datasets. */
                            keyColumnNames?: string[];
                        };
                    };
                };
                responses: {
                    /** @remarks Returns a DataSet object when successful. The returned object will have DataSet attributes based on the information that was provided when DataSet was created from the Stream created. */
                    200: {
                        headers: {
                            [name: string]: unknown;
                        };
                        content: {
                            "application/json": {
                                id?: number;
                                dataSet?: {
                                    id?: string;
                                    name?: string;
                                    description?: string;
                                    rows?: number;
                                    columns?: number;
                                    owner?: {
                                        id?: number;
                                        name?: string;
                                    };
                                    createdAt?: string;
                                    updatedAt?: string;
                                    pdpEnabled?: boolean;
                                };
                                updateMethod?: string;
                                createdAt?: string;
                                modifiedAt?: string;
                            };
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
        "/v1/streams/search": {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            /**
             * Search Streams
             * @remarks Returns all Stream objects that meet argument criteria from original request.
             */
            get: {
                parameters: {
                    query: {
                        /** @remarks The search qualifiers to search by available qualifiers: dataSource.id or dataSource.owner.id */
                        q: string;
                        /** @remarks Return desired fields: {all} or {id, dataset, updateMethod, createdAt, or modifiedAt} */
                        fields?: string;
                    };
                    header?: never;
                    path?: never;
                    cookie?: never;
                };
                requestBody?: never;
                responses: {
                    /** @remarks Returns all Stream objects that meet argument criteria from original request. */
                    200: {
                        headers: {
                            [name: string]: unknown;
                        };
                        content: {
                            "application/json": {
                                id?: number;
                                dataSet?: {
                                    id?: string;
                                    pdpEnabled?: boolean;
                                };
                                updateMethod?: string;
                                createdAt?: string;
                                modifiedAt?: string;
                            }[];
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
        "/v1/streams/{STREAM_ID}/executions/{EXECUTION_ID}": {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    /** @remarks The ID of the Stream of data being imported into a DataSet */
                    STREAM_ID: number;
                    /** @remarks The ID of the Stream execution within the Stream */
                    EXECUTION_ID: number;
                };
                cookie?: never;
            };
            /**
             * Retrieve a Stream execution
             * @remarks Import data into a DataSet in your Domo instance. This request will replace the data currently in the DataSet.
             *
             *     <!-- theme: info -->
             *     > ### Known Limitation
             *     >
             *     > The only supported content type is currently CSV format.
             *
             *     <!-- theme: info -->
             *     > ### Best Practice
             *     >
             *     > To upload data in CSV format, the Domo specification used for representing data grids in CSV format closely follows the RFC standard for CSV (RFC-4180). For more details on correct CSV formatting, click here.
             *
             */
            get: {
                parameters: {
                    query?: never;
                    header?: never;
                    path: {
                        /** @remarks The ID of the Stream of data being imported into a DataSet */
                        STREAM_ID: number;
                        /** @remarks The ID of the Stream execution within the Stream */
                        EXECUTION_ID: number;
                    };
                    cookie?: never;
                };
                requestBody?: never;
                responses: {
                    /** @remarks Returns a subset fields of a Stream's object. */
                    200: {
                        headers: {
                            [name: string]: unknown;
                        };
                        content: {
                            "application/json": {
                                id?: number;
                                startedAt?: string;
                                currentState?: string;
                                createdAt?: string;
                                modifiedAt?: string;
                            };
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
        "/v1/streams/{STREAM_ID}/executions": {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    /** @remarks The ID of the Stream */
                    STREAM_ID: number;
                };
                cookie?: never;
            };
            /**
             * List Stream executions
             * @remarks Returns all Stream Execution objects that meet argument criteria from original request.
             */
            get: {
                parameters: {
                    query?: {
                        /** @remarks The amount of Stream to return in the list. The default is 50 and the maximum is 500. */
                        limit?: number;
                        /** @remarks The offset of the Stream ID to begin list of users within the response. */
                        offset?: number;
                    };
                    header?: never;
                    path: {
                        /** @remarks The ID of the Stream */
                        STREAM_ID: number;
                    };
                    cookie?: never;
                };
                requestBody?: never;
                responses: {
                    /** @remarks Returns a subset of the Stream execution object from the specified Stream. */
                    200: {
                        headers: {
                            [name: string]: unknown;
                        };
                        content: {
                            "application/json": {
                                id?: number;
                                startedAt?: string;
                                currentState?: string;
                                createdAt?: string;
                                modifiedAt?: string;
                            }[];
                        };
                    };
                };
            };
            put?: never;
            /**
             * Create a Stream execution
             * @remarks When you’re ready to upload data to your DataSet via a Stream, you first tell Domo that you’re ready to start sending data by creating an Execution.
             *
             */
            post: {
                parameters: {
                    query?: never;
                    header?: never;
                    path: {
                        /** @remarks The ID of the Stream */
                        STREAM_ID: number;
                    };
                    cookie?: never;
                };
                requestBody?: never;
                responses: {
                    /** @remarks Returns a subset of the stream object. */
                    200: {
                        headers: {
                            [name: string]: unknown;
                        };
                        content: {
                            "application/json": {
                                id?: number;
                                startedAt?: string;
                                currentState?: string;
                                createdAt?: string;
                                modifiedAt?: string;
                            };
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
        "/v1/streams/{STREAM_ID}/executions/{EXECUTION_ID}/part/{PART_ID}": {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    /** @remarks The ID of the Stream of data being imported into a DataSet */
                    STREAM_ID: number;
                    /** @remarks The ID of the Stream execution within the Stream */
                    EXECUTION_ID: number;
                    /** @remarks The ID of the data part being used to upload a subset of data within the Stream execution */
                    PART_ID: number;
                };
                cookie?: never;
            };
            get?: never;
            /**
             * Upload a data part
             * @remarks Creates a data part within the Stream execution to upload chunks of rows to the DataSet. The calling client should keep track of parts and order them accordingly in an increasing sequence. If a part upload fails, retry the upload as all parts must be present before committing the stream execution.
             *
             *     <!-- theme: info -->
             *     > ### Best Practice
             *     >
             *     > Parts can be uploaded simultaneously in separate threads assuming that each part has a distinct part ID and is ordered correctly. To reduce upload time, compress each data as a gzip file (application/gzip).
             *
             */
            put: operations["put-v1-streams-STREAM_ID-executions---copy"];
            post?: never;
            delete?: never;
            options?: never;
            head?: never;
            patch?: never;
            trace?: never;
        };
        "/v1/streams/{STREAM_ID}/executions/{EXECUTION_ID}/commit": {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    /** @remarks The ID of the Stream of data being imported into a DataSet */
                    STREAM_ID: number;
                    /** @remarks The ID of the Stream execution within the Stream */
                    EXECUTION_ID: number;
                };
                cookie?: never;
            };
            get?: never;
            /**
             * Commit a Stream execution
             * @remarks Commits stream execution to import combined set of data parts that have been successfully uploaded.
             *
             *     <!-- theme: info -->
             *     > ### Known Limitation
             *     >
             *     > By default, the Stream API only supports the ability to execute a commit every 15 minutes. For valid use cases, contact Domo Support if you would like to execute commits more frequently than 15 minutes.
             *
             */
            put: {
                parameters: {
                    query?: never;
                    header?: never;
                    path: {
                        /** @remarks The ID of the Stream of data being imported into a DataSet */
                        STREAM_ID: number;
                        /** @remarks The ID of the Stream execution within the Stream */
                        EXECUTION_ID: number;
                    };
                    cookie?: never;
                };
                requestBody?: never;
                responses: {
                    /** @remarks Returns a subset of a stream object and a parameter of success or error based on whether the stream execution successfully committed to Domo. */
                    200: {
                        headers: {
                            [name: string]: unknown;
                        };
                        content: {
                            "application/json": {
                                id?: number;
                                startedAt?: string;
                                currentState?: string;
                                createdAt?: string;
                                modifiedAt?: string;
                            };
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
        "/v1/streams/{STREAM_ID}/executions/{EXECUTION_ID}/abort": {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    /** @remarks The ID of the Stream of data being imported into a DataSet */
                    STREAM_ID: number;
                    /** @remarks The ID of the Stream execution within the Stream, if no Stream execution ID is provided, the current Stream execution will be aborted */
                    EXECUTION_ID: number;
                };
                cookie?: never;
            };
            get?: never;
            /**
             * Abort a Stream execution
             * @remarks If needed during an execution, aborts an entire Stream execution.
             *
             *     <!-- theme: info -->
             *     > ### Best Practice
             *     >
             *     > To abort the current stream execution within a Stream, simply identify the Stream’s ID within request
             *
             */
            put: {
                parameters: {
                    query?: never;
                    header?: never;
                    path: {
                        /** @remarks The ID of the Stream of data being imported into a DataSet */
                        STREAM_ID: number;
                        /** @remarks The ID of the Stream execution within the Stream, if no Stream execution ID is provided, the current Stream execution will be aborted */
                        EXECUTION_ID: number;
                    };
                    cookie?: never;
                };
                requestBody?: never;
                responses: {
                    /** @remarks Returns a parameter of success or error based on whether the Stream ID being valid. */
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
    interface operations {
        "put-v1-streams-STREAM_ID-executions---copy": {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    /** @remarks The ID of the Stream of data being imported into a DataSet */
                    STREAM_ID: number;
                    /** @remarks The ID of the Stream execution within the Stream */
                    EXECUTION_ID: number;
                    /** @remarks The ID of the data part being used to upload a subset of data within the Stream execution */
                    PART_ID: number;
                };
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @remarks Returns a subset of a stream object and a parameter of success or error based on whether the data part within the stream execution being successful. */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": {
                            id?: number;
                            startedAt?: string;
                            currentState?: string;
                            createdAt?: string;
                            modifiedAt?: string;
                        };
                    };
                };
            };
        };
    }
}

// Types from User-API.yaml
export namespace User_API {
    interface paths {
        "/v1/users/{id}": {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    /** @remarks The ID of the user */
                    id: string;
                };
                cookie?: never;
            };
            /**
             * Retrieve a user
             * @remarks Retrieves the details of an existing user.
             */
            get: {
                parameters: {
                    query?: never;
                    header?: never;
                    path: {
                        /** @remarks The ID of the user */
                        id: string;
                    };
                    cookie?: never;
                };
                requestBody?: never;
                responses: {
                    /** @remarks Returns a user object if valid user ID was provided. When requesting, if the user ID is related to a user that has been deleted, a subset of the user information will be returned, including a deleted property, which will be true. */
                    200: {
                        headers: {
                            [name: string]: unknown;
                        };
                        content: {
                            "application/json": {
                                id?: number;
                                title?: string;
                                email?: string;
                                alternateEmail?: string;
                                role?: string;
                                phone?: string;
                                name?: string;
                                location?: string;
                                roleId?: string;
                                employeeNumber?: number;
                                createdAt?: string;
                                updatedAt?: string;
                                deleted?: boolean;
                                image?: string;
                                groups?: {
                                    id?: number;
                                    name?: string;
                                }[];
                            };
                        };
                    };
                };
            };
            /**
             * Update a user
             * @remarks Updates the specified user by providing values to parameters passed. Any parameter left out of the request will cause the specific user’s attribute to remain unchanged.
             *
             *
             *     <!-- theme: yeild -->
             *
             *     > #### Known Limitation
             *     >
             *     > Currently all user fields are required
             */
            put: {
                parameters: {
                    query?: {
                        /** @remarks User's full name */
                        name?: string;
                        /** @remarks User's primary email used in profile */
                        email?: string;
                        /** @remarks The system role of the user (available roles are: 'Admin', 'Privileged', 'Participant') */
                        role?: string;
                        /** @remarks The ID of the custom or system role of the user */
                        roled?: number;
                        /** @remarks User's job title */
                        title?: string;
                        /** @remarks User's secondary email in profile */
                        alternateEmail?: string;
                        /** @remarks Primary phone number of user */
                        phone?: string;
                        /** @remarks Free text that can be used to define office location (e.g. City, State, Country) */
                        location?: string;
                        /** @remarks Time zone used to display to user the system times throughout Domo application */
                        timezone?: string;
                        /** @remarks Locale used to display to user the system settings throughout Domo application */
                        locale?: string;
                        /** @remarks Employee number within company */
                        employeeNumber?: string;
                    };
                    header?: never;
                    path: {
                        /** @remarks The ID of the user */
                        id: string;
                    };
                    cookie?: never;
                };
                requestBody?: {
                    content: {
                        "application/json": {
                            email?: string;
                            role?: string;
                            name?: string;
                        };
                    };
                };
                responses: {
                    /** @remarks Returns a 200 response code when successful. */
                    200: {
                        headers: {
                            [name: string]: unknown;
                        };
                        content?: never;
                    };
                };
            };
            post?: never;
            /**
             * Delete a user
             * @remarks Permanently deletes a user from your Domo instance.
             *
             *     <!-- theme: danger -->
             *
             *     > #### Warning
             *     >
             *     > This is destructive and cannot be reversed.
             *
             *     <!-- theme: info -->
             *
             *     > #### Heads up
             *     >
             *     > Domo won't allow deletion of users if they own Datasets or Dataflows. You'll need to transfer ownership of these assets before deletion. All other assets previously owned by the deleted user will be orphaned.
             */
            delete: {
                parameters: {
                    query?: never;
                    header?: never;
                    path: {
                        /** @remarks The ID of the user */
                        id: string;
                    };
                    cookie?: never;
                };
                requestBody?: never;
                responses: {
                    /** @remarks Returns a 204 response code when successful or error based on whether the user ID being valid. */
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
        "/v1/users": {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            /**
             * List users
             * @remarks Get a list of all users in your Domo instance.
             */
            get: {
                parameters: {
                    query?: {
                        /** @remarks The amount of users to return in the list. The default is 50 and the maximum is 500. */
                        limit?: number;
                        /** @remarks The offset of the user ID to begin list of users within the response. */
                        offset?: number;
                    };
                    header?: never;
                    path?: never;
                    cookie?: never;
                };
                requestBody?: never;
                responses: {
                    /** @remarks Returns all user objects that meet argument criteria from original request. */
                    200: {
                        headers: {
                            [name: string]: unknown;
                        };
                        content: {
                            "application/json": {
                                id?: number;
                                title?: string;
                                email?: string;
                                role?: string;
                                phone?: string;
                                name?: string;
                            }[];
                        };
                    };
                };
            };
            put?: never;
            /**
             * Create a user
             * @remarks Creates a new user in your Domo instance.
             */
            post: {
                parameters: {
                    query: {
                        /** @remarks User's full name */
                        name: string;
                        /** @remarks User's primary email used in profile */
                        email: string;
                        /** @remarks The role of the user created (available roles are: 'Admin', 'Privileged', 'Participant') */
                        role: string;
                        /** @remarks Send an email invite to created user */
                        sendInvite?: boolean;
                        /** @remarks User's job title */
                        title?: string;
                        /** @remarks User's secondary email in profile */
                        alternateEmail?: string;
                        /** @remarks Primary phone number of user */
                        phone?: string;
                        /** @remarks Free text that can be used to define office location (e.g. City, State, Country) */
                        location?: string;
                        /** @remarks Time zone used to display to user the system times throughout Domo application */
                        timezone?: string;
                        /** @remarks Locale used to display to user the system settings throughout Domo application */
                        locale?: string;
                        /** @remarks Employee number within company */
                        employeeNumber?: string;
                    };
                    header?: never;
                    path?: never;
                    cookie?: never;
                };
                requestBody?: {
                    content: {
                        "application/json": {
                            title?: string;
                            email?: string;
                            alternateEmail?: string;
                            role?: string;
                            phone?: string;
                            name?: string;
                            location?: string;
                            timezone?: string;
                            locale?: string;
                            employeeNumber?: number;
                        };
                    };
                };
                responses: {
                    /** @remarks Returns a user object when successful. The returned object will have user attributes based on the information that was provided when user was created. The two exceptions of attributes not returned are the user's timezone and locale. */
                    200: {
                        headers: {
                            [name: string]: unknown;
                        };
                        content: {
                            "application/json": {
                                alternateEmail?: string;
                                createdAt?: string;
                                email?: string;
                                employeeNumber?: number;
                                groups?: {
                                    id?: number;
                                    name?: string;
                                }[];
                                id?: number;
                                image?: string;
                                location?: string;
                                name?: string;
                                phone?: string;
                                role?: string;
                                title?: string;
                                updatedAt?: string;
                            };
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
