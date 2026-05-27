const swaggerSpec = {
    openapi: "3.0.3",
    info: {
        title: "Munchies API",
        version: "1.0.0",
        description: "API documentation for the Munchies backend.",
    },
    servers: [
        {
            url: "http://localhost:4000",
            description: "Local development server",
        },
    ],
    tags: [
        { name: "Auth" },
        { name: "Stores" },
        { name: "Cart" },
        { name: "Checkout" },
        { name: "Bookings" },
        { name: "Owner" },
        { name: "Store Owner Requests" },
        { name: "Admin" },
    ],
    components: {
        securitySchemes: {
            bearerAuth: {
                type: "http",
                scheme: "bearer",
                bearerFormat: "JWT",
            },
        },
        schemas: {
            Role: {
                type: "string",
                enum: ["USER", "STORE_OWNER", "ADMIN"],
            },
            BookingStatus: {
                type: "string",
                enum: ["PLACED", "ACCEPTED", "READY", "REJECTED", "COMPLETED"],
            },
            User: {
                type: "object",
                properties: {
                    id: { type: "string" },
                    email: { type: "string", format: "email" },
                    firstName: { type: "string" },
                    role: { $ref: "#/components/schemas/Role" },
                },
            },
            AuthResponse: {
                type: "object",
                properties: {
                    token: { type: "string" },
                    user: { $ref: "#/components/schemas/User" },
                },
            },
            Store: {
                type: "object",
                properties: {
                    id: { type: "string" },
                    name: { type: "string" },
                    hostel: { type: "string" },
                    room: { type: "string" },
                    roomNumber: { type: "string" },
                    tagline: { type: "string" },
                },
            },
            Item: {
                type: "object",
                properties: {
                    id: { type: "string" },
                    storeId: { type: "string" },
                    name: { type: "string" },
                    price: { type: "number" },
                    imageUrl: { type: "string" },
                    stockQuantity: { type: "number" },
                },
            },
            BookingItem: {
                type: "object",
                properties: {
                    id: { type: "string" },
                    quantity: { type: "number" },
                    unitPrice: { type: "number" },
                    item: {
                        type: "object",
                        properties: {
                            id: { type: "string" },
                            name: { type: "string" },
                        },
                    },
                },
            },
            Booking: {
                type: "object",
                properties: {
                    id: { type: "string" },
                    status: { $ref: "#/components/schemas/BookingStatus" },
                    totalAmount: { type: "number" },
                },
            },
            BookingWithRelations: {
                allOf: [
                    { $ref: "#/components/schemas/Booking" },
                    {
                        type: "object",
                        properties: {
                            store: { $ref: "#/components/schemas/Store" },
                            user: { $ref: "#/components/schemas/User" },
                            items: {
                                type: "array",
                                items: { $ref: "#/components/schemas/BookingItem" },
                            },
                        },
                    },
                ],
            },
            CartItem: {
                type: "object",
                properties: {
                    id: { type: "string" },
                    quantity: { type: "number" },
                    item: { $ref: "#/components/schemas/Item" },
                },
            },
            Cart: {
                type: "object",
                properties: {
                    id: { type: "string" },
                    userId: { type: "string" },
                    storeId: { type: "string" },
                    items: {
                        type: "array",
                        items: { $ref: "#/components/schemas/CartItem" },
                    },
                },
            },
            StoreOwnerRequest: {
                type: "object",
                properties: {
                    id: { type: "string" },
                    userId: { type: "string" },
                    status: {
                        type: "string",
                        enum: ["PENDING", "APPROVED", "REJECTED"],
                    },
                },
            },
            ApiMessage: {
                type: "object",
                properties: {
                    message: { type: "string" },
                },
            },
        },
        responses: {
            Unauthorized: {
                description: "Missing or invalid bearer token",
            },
            Forbidden: {
                description: "The authenticated user does not have access to this resource",
            },
        },
    },
    paths: {
        "/": {
            get: {
                tags: ["Stores"],
                summary: "Health check",
                responses: {
                    200: {
                        description: "API status",
                    },
                },
            },
        },
        "/auth/register": {
            post: {
                tags: ["Auth"],
                summary: "Create a new user account",
                requestBody: {
                    required: true,
                    content: {
                        "application/json": {
                            schema: {
                                type: "object",
                                required: ["email", "password"],
                                properties: {
                                    email: { type: "string", format: "email" },
                                    password: { type: "string" },
                                    firstName: { type: "string" },
                                },
                            },
                        },
                    },
                },
                responses: {
                    200: {
                        description: "User created",
                        content: {
                            "application/json": {
                                schema: { $ref: "#/components/schemas/User" },
                            },
                        },
                    },
                },
            },
        },
        "/auth/login": {
            post: {
                tags: ["Auth"],
                summary: "Authenticate a user and receive a JWT",
                requestBody: {
                    required: true,
                    content: {
                        "application/json": {
                            schema: {
                                type: "object",
                                required: ["email", "password"],
                                properties: {
                                    email: { type: "string", format: "email" },
                                    password: { type: "string" },
                                },
                            },
                        },
                    },
                },
                responses: {
                    200: {
                        description: "JWT token and user payload",
                        content: {
                            "application/json": {
                                schema: { $ref: "#/components/schemas/AuthResponse" },
                            },
                        },
                    },
                },
            },
        },
        "/stores": {
            get: {
                tags: ["Stores"],
                summary: "List all stores",
                responses: {
                    200: {
                        description: "List of stores",
                    },
                },
            },
        },
        "/stores/{id}": {
            get: {
                tags: ["Stores"],
                summary: "Get a single store",
                parameters: [
                    {
                        in: "path",
                        name: "id",
                        required: true,
                        schema: { type: "string" },
                    },
                ],
                responses: {
                    200: {
                        description: "Store details",
                    },
                    404: {
                        description: "Store not found",
                    },
                },
            },
        },
        "/stores/{id}/items": {
            get: {
                tags: ["Stores"],
                summary: "List items for a store",
                parameters: [
                    {
                        in: "path",
                        name: "id",
                        required: true,
                        schema: { type: "string" },
                    },
                ],
                responses: {
                    200: {
                        description: "List of items",
                    },
                },
            },
        },
        "/protected": {
            get: {
                tags: ["Admin"],
                summary: "Authenticated test endpoint",
                security: [{ bearerAuth: [] }],
                responses: {
                    200: {
                        description: "Authenticated response",
                    },
                    401: {
                        $ref: "#/components/responses/Unauthorized",
                    },
                },
            },
        },
        "/admin": {
            get: {
                tags: ["Admin"],
                summary: "Admin-only test endpoint",
                security: [{ bearerAuth: [] }],
                responses: {
                    200: {
                        description: "Admin response",
                    },
                    401: {
                        $ref: "#/components/responses/Unauthorized",
                    },
                    403: {
                        $ref: "#/components/responses/Forbidden",
                    },
                },
            },
        },
        "/cart/{storeId}": {
            get: {
                tags: ["Cart"],
                summary: "Get the current user's cart for a store",
                security: [{ bearerAuth: [] }],
                parameters: [
                    {
                        in: "path",
                        name: "storeId",
                        required: true,
                        schema: { type: "string" },
                    },
                ],
                responses: {
                    200: { description: "Cart payload" },
                    401: { $ref: "#/components/responses/Unauthorized" },
                },
            },
        },
        "/cart/{storeId}/add": {
            post: {
                tags: ["Cart"],
                summary: "Add an item to the cart",
                security: [{ bearerAuth: [] }],
                parameters: [
                    {
                        in: "path",
                        name: "storeId",
                        required: true,
                        schema: { type: "string" },
                    },
                ],
                requestBody: {
                    required: true,
                    content: {
                        "application/json": {
                            schema: {
                                type: "object",
                                required: ["itemId", "quantity"],
                                properties: {
                                    itemId: { type: "string" },
                                    quantity: { type: "number" },
                                },
                            },
                        },
                    },
                },
                responses: {
                    200: { description: "Created or updated cart item" },
                },
            },
        },
        "/cart/item/{id}": {
            put: {
                tags: ["Cart"],
                summary: "Update cart item quantity",
                security: [{ bearerAuth: [] }],
                parameters: [
                    {
                        in: "path",
                        name: "id",
                        required: true,
                        schema: { type: "string" },
                    },
                ],
                requestBody: {
                    required: true,
                    content: {
                        "application/json": {
                            schema: {
                                type: "object",
                                required: ["quantity"],
                                properties: {
                                    quantity: { type: "number" },
                                },
                            },
                        },
                    },
                },
                responses: {
                    200: { description: "Updated cart item" },
                },
            },
            delete: {
                tags: ["Cart"],
                summary: "Remove a cart item",
                security: [{ bearerAuth: [] }],
                parameters: [
                    {
                        in: "path",
                        name: "id",
                        required: true,
                        schema: { type: "string" },
                    },
                ],
                responses: {
                    200: { description: "Item removed" },
                },
            },
        },
        "/checkout/{storeId}": {
            post: {
                tags: ["Checkout"],
                summary: "Create a booking from the cart",
                security: [{ bearerAuth: [] }],
                parameters: [
                    {
                        in: "path",
                        name: "storeId",
                        required: true,
                        schema: { type: "string" },
                    },
                ],
                responses: {
                    200: {
                        description: "Booking created",
                        content: {
                            "application/json": {
                                schema: { $ref: "#/components/schemas/BookingWithRelations" },
                            },
                        },
                    },
                },
            },
        },
        "/bookings": {
            get: {
                tags: ["Bookings"],
                summary: "Get the current user's bookings",
                security: [{ bearerAuth: [] }],
                responses: {
                    200: {
                        description: "Booking history",
                    },
                },
            },
        },
        "/owner/bookings": {
            get: {
                tags: ["Owner"],
                summary: "Get bookings for stores owned by the current user",
                security: [{ bearerAuth: [] }],
                responses: {
                    200: {
                        description: "Owner booking list",
                    },
                },
            },
        },
        "/owner/bookings/{id}/status": {
            post: {
                tags: ["Owner"],
                summary: "Update a booking status for an owned store",
                security: [{ bearerAuth: [] }],
                parameters: [
                    {
                        in: "path",
                        name: "id",
                        required: true,
                        schema: { type: "string" },
                    },
                ],
                requestBody: {
                    required: true,
                    content: {
                        "application/json": {
                            schema: {
                                type: "object",
                                required: ["status"],
                                properties: {
                                    status: {
                                        $ref: "#/components/schemas/BookingStatus",
                                    },
                                },
                            },
                        },
                    },
                },
                responses: {
                    200: {
                        description: "Booking updated",
                    },
                },
            },
        },
        "/owner/items": {
            get: {
                tags: ["Owner"],
                summary: "Get store inventory for the owner",
                security: [{ bearerAuth: [] }],
                responses: {
                    200: {
                        description: "Stores and items",
                    },
                },
            },
            post: {
                tags: ["Owner"],
                summary: "Create a store item",
                security: [{ bearerAuth: [] }],
                requestBody: {
                    required: true,
                    content: {
                        "application/json": {
                            schema: {
                                type: "object",
                                required: ["storeId", "name", "price", "imageUrl", "stockQuantity"],
                                properties: {
                                    storeId: { type: "string" },
                                    name: { type: "string" },
                                    price: { type: "number" },
                                    imageUrl: { type: "string" },
                                    stockQuantity: { type: "number" },
                                },
                            },
                        },
                    },
                },
                responses: {
                    200: { description: "Created item" },
                },
            },
        },
        "/owner/items/{id}": {
            put: {
                tags: ["Owner"],
                summary: "Update a store item",
                security: [{ bearerAuth: [] }],
                parameters: [
                    {
                        in: "path",
                        name: "id",
                        required: true,
                        schema: { type: "string" },
                    },
                ],
                responses: {
                    200: { description: "Updated item" },
                },
            },
            delete: {
                tags: ["Owner"],
                summary: "Delete a store item",
                security: [{ bearerAuth: [] }],
                parameters: [
                    {
                        in: "path",
                        name: "id",
                        required: true,
                        schema: { type: "string" },
                    },
                ],
                responses: {
                    200: { description: "Deleted item" },
                },
            },
        },
        "/store-owner-request": {
            post: {
                tags: ["Store Owner Requests"],
                summary: "Submit a store owner request",
                security: [{ bearerAuth: [] }],
                responses: {
                    200: { description: "Request submitted" },
                },
            },
        },
        "/admin/store-owner-requests": {
            get: {
                tags: ["Admin"],
                summary: "List store owner requests",
                security: [{ bearerAuth: [] }],
                responses: {
                    200: { description: "Requests list" },
                },
            },
        },
        "/admin/store-owner-requests/{id}/approve": {
            post: {
                tags: ["Admin"],
                summary: "Approve a store owner request",
                security: [{ bearerAuth: [] }],
                parameters: [
                    {
                        in: "path",
                        name: "id",
                        required: true,
                        schema: { type: "string" },
                    },
                ],
                responses: {
                    200: { description: "Request approved" },
                },
            },
        },
        "/admin/store-owner-requests/{id}/reject": {
            post: {
                tags: ["Admin"],
                summary: "Reject a store owner request",
                security: [{ bearerAuth: [] }],
                parameters: [
                    {
                        in: "path",
                        name: "id",
                        required: true,
                        schema: { type: "string" },
                    },
                ],
                responses: {
                    200: { description: "Request rejected" },
                },
            },
        },
    },
} as const;

export default swaggerSpec;
