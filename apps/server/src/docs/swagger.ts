const swaggerSpec = {
    openapi: "3.0.3",
    info: {
        title: "Munchies API",
        version: "1.0.0",
        description: "API documentation for the Munchies.",
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
                enum: [
                    "PLACED",
                    "ACCEPTED",
                    "READY",
                    "REJECTED",
                    "COMPLETED",
                    "CANCEL_REQUESTED",
                    "CANCELLED"
                ],
            },
            DiscountType: {
                type: "string",
                enum: ["PERCENTAGE", "FLAT"],
            },
            SaleCampaign: {
                type: "object",
                properties: {
                    id: { type: "string" },
                    storeId: { type: "string" },
                    code: { type: "string" },
                    discountType: { $ref: "#/components/schemas/DiscountType" },
                    discountValue: { type: "number" },
                    startDate: { type: "string", format: "date-time" },
                    endDate: { type: "string", format: "date-time" },
                    minOrderValue: { type: "number" },
                    globalLimit: { type: "number", nullable: true },
                    perUserLimit: { type: "number", nullable: true },
                    usedCount: { type: "number" },
                    isActive: { type: "boolean" },
                    createdAt: { type: "string", format: "date-time" },
                    updatedAt: { type: "string", format: "date-time" },
                },
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
            StoreBlock: {
                type: "object",
                properties: {
                    id: { type: "string" },
                    userId: { type: "string" },
                    storeId: { type: "string" },
                    store: {
                        type: "object",
                        properties: {
                            id: { type: "string" },
                            name: { type: "string" },
                        },
                    },
                },
            },
            ManagedUser: {
                type: "object",
                properties: {
                    id: { type: "string" },
                    email: { type: "string", format: "email" },
                    firstName: { type: "string" },
                    role: { $ref: "#/components/schemas/Role" },
                    warningsCount: { type: "number" },
                    isBlocked: { type: "boolean" },
                    storeBlocks: {
                        type: "array",
                        items: { $ref: "#/components/schemas/StoreBlock" },
                    },
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
                summary: "Create a booking from the cart, optionally applying a coupon code",
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
                    content: {
                        "application/json": {
                            schema: {
                                type: "object",
                                properties: {
                                    couponCode: { type: "string", description: "Optional coupon code to apply to this order" },
                                },
                            },
                        },
                    },
                },
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
        "/checkout/{storeId}/validate-coupon": {
            post: {
                tags: ["Checkout"],
                summary: "Validate a coupon code and calculate potential discount",
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
                                required: ["couponCode"],
                                properties: {
                                    couponCode: { type: "string" },
                                },
                            },
                        },
                    },
                },
                responses: {
                    200: {
                        description: "Coupon is valid",
                        content: {
                            "application/json": {
                                schema: {
                                    type: "object",
                                    properties: {
                                        couponCode: { type: "string" },
                                        discountAmount: { type: "number" },
                                        originalTotal: { type: "number" },
                                        finalTotal: { type: "number" },
                                    },
                                },
                            },
                        },
                    },
                    400: {
                        description: "Invalid coupon code or constraint violation",
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
        "/bookings/{id}/cancel-request": {
            post: {
                tags: ["Bookings"],
                summary: "Request cancellation of a booking",
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
                    200: {
                        description: "Cancellation request successfully submitted",
                        content: {
                            "application/json": {
                                schema: {
                                    type: "object",
                                    properties: {
                                        message: { type: "string" },
                                        booking: { $ref: "#/components/schemas/BookingWithRelations" },
                                    },
                                },
                            },
                        },
                    },
                    400: {
                        description: "Invalid booking status for cancellation",
                    },
                    403: {
                        $ref: "#/components/responses/Forbidden",
                    },
                    404: {
                        description: "Booking not found",
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
        "/owner/bookings/{id}/cancel-respond": {
            post: {
                tags: ["Owner"],
                summary: "Respond to a cancellation request",
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
                                required: ["action"],
                                properties: {
                                    action: {
                                        type: "string",
                                        enum: ["approve", "reject"],
                                    },
                                },
                            },
                        },
                    },
                },
                responses: {
                    200: {
                        description: "Cancellation request processed",
                        content: {
                            "application/json": {
                                schema: {
                                    type: "object",
                                    properties: {
                                        message: { type: "string" },
                                        booking: { $ref: "#/components/schemas/BookingWithRelations" },
                                    },
                                },
                            },
                        },
                    },
                    400: {
                        description: "Invalid action or booking is not in CANCEL_REQUESTED status",
                    },
                    403: {
                        $ref: "#/components/responses/Forbidden",
                    },
                    404: {
                        description: "Booking not found",
                    },
                },
            },
        },
        "/owner/campaigns": {
            get: {
                tags: ["Owner"],
                summary: "List all sale campaigns for stores owned by the current owner",
                security: [{ bearerAuth: [] }],
                responses: {
                    200: {
                        description: "List of campaigns",
                        content: {
                            "application/json": {
                                schema: {
                                    type: "array",
                                    items: { $ref: "#/components/schemas/SaleCampaign" },
                                },
                            },
                        },
                    },
                },
            },
            post: {
                tags: ["Owner"],
                summary: "Create a new sale campaign and generate unique coupon code",
                security: [{ bearerAuth: [] }],
                requestBody: {
                    required: true,
                    content: {
                        "application/json": {
                            schema: {
                                type: "object",
                                required: ["storeId", "discountType", "discountValue", "startDate", "endDate"],
                                properties: {
                                    storeId: { type: "string" },
                                    code: { type: "string", description: "Optional custom unique code. Auto-generated if omitted." },
                                    discountType: { $ref: "#/components/schemas/DiscountType" },
                                    discountValue: { type: "number" },
                                    startDate: { type: "string", format: "date-time" },
                                    endDate: { type: "string", format: "date-time" },
                                    minOrderValue: { type: "number", default: 0 },
                                    globalLimit: { type: "number", nullable: true },
                                    perUserLimit: { type: "number", nullable: true },
                                },
                            },
                        },
                    },
                },
                responses: {
                    200: {
                        description: "Campaign successfully created",
                        content: {
                            "application/json": {
                                schema: { $ref: "#/components/schemas/SaleCampaign" },
                            },
                        },
                    },
                    400: {
                        description: "Validation error or code already in use",
                    },
                },
            },
        },
        "/owner/campaigns/{id}": {
            get: {
                tags: ["Owner"],
                summary: "Get specific campaign details",
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
                    200: {
                        description: "Campaign details",
                        content: {
                            "application/json": {
                                schema: { $ref: "#/components/schemas/SaleCampaign" },
                            },
                        },
                    },
                    404: {
                        description: "Campaign not found",
                    },
                },
            },
            delete: {
                tags: ["Owner"],
                summary: "Delete a sale campaign",
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
                    200: {
                        description: "Campaign successfully deleted",
                    },
                    404: {
                        description: "Campaign not found",
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
                        "multipart/form-data": {
                            schema: {
                                type: "object",
                                required: [
                                    "storeId",
                                    "name",
                                    "price",
                                    "stockQuantity",
                                    "image"
                                ],
                                properties: {
                                    storeId: { type: "string" },
                                    name: { type: "string" },
                                    price: { type: "number" },
                                    stockQuantity: { type: "number" },
                                    image: {
                                        type: "string",
                                        format: "binary",
                                        description: "Item image file upload",
                                    },
                                },
                            },
                        },
                    },
                },
                responses: {
                    200: {
                        description: "Created item",
                        content: {
                            "application/json": {
                                schema: { $ref: "#/components/schemas/Item" },
                            },
                        },
                    },
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
                requestBody: {
                    content: {
                        "multipart/form-data": {
                            schema: {
                                type: "object",
                                properties: {
                                    name: { type: "string" },
                                    price: { type: "number" },
                                    stockQuantity: { type: "number" },
                                    image: {
                                        type: "string",
                                        format: "binary",
                                        description: "Optional new item image file upload",
                                    },
                                },
                            },
                        },
                    },
                },
                responses: {
                    200: {
                        description: "Updated item",
                        content: {
                            "application/json": {
                                schema: { $ref: "#/components/schemas/Item" },
                            },
                        },
                    },
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
        "/admin/users": {
            get: {
                tags: ["Admin"],
                summary: "List all registered non-admin users",
                security: [{ bearerAuth: [] }],
                responses: {
                    200: {
                        description: "List of users with block statistics and store blocks details",
                        content: {
                            "application/json": {
                                schema: {
                                    type: "array",
                                    items: { $ref: "#/components/schemas/ManagedUser" },
                                },
                            },
                        },
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
        "/admin/users/{id}/block": {
            post: {
                tags: ["Admin"],
                summary: "Enforce or lift a global block on a user",
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
                                required: ["isBlocked"],
                                properties: {
                                    isBlocked: { type: "boolean" },
                                },
                            },
                        },
                    },
                },
                responses: {
                    200: {
                        description: "Global block status updated",
                    },
                    400: {
                        description: "Parameter isBlocked must be a boolean",
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
        "/admin/users/{id}/store-block": {
            post: {
                tags: ["Admin"],
                summary: "Enforce or lift a store-specific block on a user",
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
                                required: ["storeId", "isBlocked"],
                                properties: {
                                    storeId: { type: "string" },
                                    isBlocked: { type: "boolean" },
                                },
                            },
                        },
                    },
                },
                responses: {
                    200: {
                        description: "Store block status updated successfully",
                    },
                    400: {
                        description: "storeId is required or parameter isBlocked must be a boolean",
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
        "/admin/stores": {
            get: {
                tags: ["Admin"],
                summary: "List all stores with simplified location details for management",
                security: [{ bearerAuth: [] }],
                responses: {
                    200: {
                        description: "List of stores",
                        content: {
                            "application/json": {
                                schema: {
                                    type: "array",
                                    items: {
                                        type: "object",
                                        properties: {
                                            id: { type: "string" },
                                            name: { type: "string" },
                                            hostel: { type: "string" },
                                            roomNumber: { type: "string" },
                                        },
                                    },
                                },
                            },
                        },
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
    },
} as const;

export default swaggerSpec;
