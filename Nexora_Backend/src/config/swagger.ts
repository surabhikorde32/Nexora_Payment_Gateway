import swaggerJSDoc from "swagger-jsdoc";

const swaggerDefinition = {
  openapi: "3.0.0",
  info: {
    title: "PC Demo API",
    version: "1.0.0",
    description: "API documentation for authentication, role access, health, and uploads.",
  },
  servers: [
    {
      url: `http://localhost:${process.env.PORT || 5000}`,
      description: "Local server",
    },
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: "http",
        scheme: "bearer",
        bearerFormat: "JWT",
      },
      cookieAuth: {
        type: "apiKey",
        in: "cookie",
        name: "accessToken",
      },
    },
    schemas: {
      RegisterRequest: {
        type: "object",
        required: ["name", "email", "password"],
        properties: {
          name: { type: "string", example: "John Doe" },
          email: { type: "string", format: "email", example: "john@example.com" },
          password: { type: "string", minLength: 8, example: "StrongPass123" },
          role: {
            type: "string",
            enum: ["user", "contractor"],
            example: "user",
          },
        },
      },
      LoginRequest: {
        type: "object",
        required: ["email", "password"],
        properties: {
          email: { type: "string", format: "email", example: "john@example.com" },
          password: { type: "string", example: "StrongPass123" },
        },
      },
      AuthResponse: {
        type: "object",
        properties: {
          success: { type: "boolean", example: true },
          token: { type: "string", example: "jwt.token.value" },
          user: {
            type: "object",
            properties: {
              id: { type: "string", example: "65f1234567890abcdef12345" },
              name: { type: "string", example: "John Doe" },
              email: { type: "string", example: "john@example.com" },
              role: { type: "string", example: "user" },
            },
          },
        },
      },
      ErrorResponse: {
        type: "object",
        properties: {
          success: { type: "boolean", example: false },
          message: { type: "string", example: "Authentication required" },
          requestId: { type: "string", example: "2f932680-a6bb-4a85-b9ad-e2aa74179d44" },
        },
      },
    },
  },
  paths: {
    "/health": {
      get: {
        tags: ["Health"],
        summary: "Check server health",
        responses: {
          200: {
            description: "Server is healthy",
          },
        },
      },
    },
    "/api/auth/register": {
      post: {
        tags: ["Auth"],
        summary: "Register a user or contractor",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/RegisterRequest" },
            },
          },
        },
        responses: {
          201: {
            description: "Registered successfully",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/AuthResponse" },
              },
            },
          },
          400: {
            description: "Invalid request",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
              },
            },
          },
        },
      },
    },
    "/api/auth/login": {
      post: {
        tags: ["Auth"],
        summary: "Login",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/LoginRequest" },
            },
          },
        },
        responses: {
          200: {
            description: "Logged in successfully",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/AuthResponse" },
              },
            },
          },
          401: {
            description: "Invalid credentials",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
              },
            },
          },
        },
      },
    },
    "/api/auth/logout": {
      post: {
        tags: ["Auth"],
        summary: "Logout",
        responses: {
          200: {
            description: "Logged out successfully",
          },
        },
      },
    },
    "/api/auth/me": {
      get: {
        tags: ["Auth"],
        summary: "Get current user from JWT",
        security: [{ bearerAuth: [] }, { cookieAuth: [] }],
        responses: {
          200: { description: "Current user" },
          401: { description: "Authentication required" },
        },
      },
    },
    "/api/auth/admin": {
      get: {
        tags: ["Roles"],
        summary: "Admin-only route",
        security: [{ bearerAuth: [] }, { cookieAuth: [] }],
        responses: {
          200: { description: "Admin access granted" },
          403: { description: "Forbidden" },
        },
      },
    },
    "/api/auth/user": {
      get: {
        tags: ["Roles"],
        summary: "Admin or user route",
        security: [{ bearerAuth: [] }, { cookieAuth: [] }],
        responses: {
          200: { description: "User access granted" },
          403: { description: "Forbidden" },
        },
      },
    },
    "/api/auth/contractor": {
      get: {
        tags: ["Roles"],
        summary: "Admin or contractor route",
        security: [{ bearerAuth: [] }, { cookieAuth: [] }],
        responses: {
          200: { description: "Contractor access granted" },
          403: { description: "Forbidden" },
        },
      },
    },
    "/api/upload": {
      post: {
        tags: ["Upload"],
        summary: "Upload one file",
        requestBody: {
          required: true,
          content: {
            "multipart/form-data": {
              schema: {
                type: "object",
                properties: {
                  file: {
                    type: "string",
                    format: "binary",
                  },
                },
              },
            },
          },
        },
        responses: {
          201: { description: "File uploaded" },
          400: { description: "Unsupported file type" },
        },
      },
    },
  },
};

export const swaggerSpec = swaggerJSDoc({
  definition: swaggerDefinition,
  apis: ["./server.ts", "./src/**/*.ts"],
});
