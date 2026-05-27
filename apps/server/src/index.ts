import dotenv from "dotenv";
import path from "path";
import express from "express";
import cors from "cors";

const envPath = path.resolve(__dirname, "../../../.env");
dotenv.config({ path: envPath });
dotenv.config();

import { prisma } from "./lib/prisma";
import swaggerSpec from "./docs/swagger";

import authRoutes from "./routes/auth";
import ownerRoutes from "./routes/owner";
import cartRoutes from "./routes/cart";
import checkoutRoutes from "./routes/checkout";
import bookingsRoutes from "./routes/bookings";
import storeOwnerRequestRoutes from "./routes/storeOwnerRequest";
import adminRoutes from "./routes/admin";

import {
    requireAuth,
    requireRole,
} from "./middleware/auth";

const app = express();

app.use(cors());
app.use(express.json());
app.use("/uploads", express.static(path.resolve(process.cwd(), "uploads")));

app.use("/auth", authRoutes);
app.use("/owner", ownerRoutes);
app.use("/cart", cartRoutes);
app.use("/checkout", checkoutRoutes);
app.use("/bookings", bookingsRoutes);
app.use("/store-owner-request", storeOwnerRequestRoutes);
app.use("/admin", adminRoutes);
app.get("/openapi.json", (req, res) => {
    res.json(swaggerSpec);
});
app.get("/docs", (req, res) => {
    res.send(`
        <!doctype html>
        <html lang="en">
          <head>
            <title>Munchies API Reference</title>
            <meta charset="utf-8" />
            <meta name="viewport" content="width=device-width, initial-scale=1" />
            <link rel="icon" type="image/png" href="https://images.unsplash.com/photo-1612927601601-6638404737ce?auto=format&fit=crop&w=32&q=80" />
            <style>
              body {
                margin: 0;
              }
              /* Premium Scalar overrides for Munchies branding */
              :root {
                --scalar-brand: #f97316 !important;
                --scalar-brand-hover: #ea580c !important;
                --scalar-color-accent: #f97316 !important;
                --scalar-background-1: #fffaf5 !important;
                --scalar-font: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif !important;
              }
            </style>
          </head>
          <body>
            <script
              id="api-reference"
              data-url="/openapi.json"
              data-configuration='{"theme":"candy","layout":"classic"}'></script>
            <script src="https://cdn.jsdelivr.net/npm/@scalar/api-reference"></script>
          </body>
        </html>
    `);
});
app.get("/", (req, res) => {
    res.json({
        message: "Munchies API running",
    });
});



function mapStore(store: {
    id: string;
    name: string;
    hostel: string;
    roomNumber: string;
}) {
    return {
        id: store.id,
        name: store.name,
        hostel: store.hostel,
        room: store.roomNumber,
        tagline: "",
    };
}

function mapItem(item: {
    id: string;
    storeId: string;
    name: string;
    price: number;
    imageUrl: string;
    stockQuantity: number;
}) {
    return {
        id: item.id,
        storeId: item.storeId,
        name: item.name,
        price: item.price,
        imageUrl: item.imageUrl,
        stockQuantity: item.stockQuantity,
    };
}

app.get("/stores", async (req, res) => {
    try {
        const stores = await prisma.store.findMany({
            orderBy: {
                name: "asc",
            },
        });

        res.json(stores.map(mapStore));
    } catch (error) {
        console.error(error);

        res.status(500).json({
            error: "Failed to fetch stores",
        });
    }
});



// GET SINGLE STORE
app.get("/stores/:id", async (req, res) => {
    try {
        const store = await prisma.store.findUnique({
            where: {
                id: req.params.id,
            },
        });

        if (!store) {
            return res.status(404).json({
                error: "Store not found",
            });
        }

        res.json(mapStore(store));
    } catch (error) {
        console.error(error);

        res.status(500).json({
            error: "Failed to fetch store",
        });
    }
});

app.get("/stores/:id/items", async (req, res) => {
    try {
        const storeItems = await prisma.item.findMany({
            where: {
                storeId: req.params.id,
            },
            orderBy: {
                name: "asc",
            },
        });

        res.json(storeItems.map(mapItem));
    } catch (error) {
        console.error(error);

        res.status(500).json({
            error: "Failed to fetch items",
        });
    }
});

app.get(
    "/protected",
    requireAuth,
    (req, res) => {
        res.json({
            message: "You are authenticated",
        });
    }
);

app.get(
    "/admin",
    requireAuth,
    requireRole("ADMIN"),
    (req, res) => {
        res.json({
            message: "Welcome admin",
        });
    }
);

app.listen(4000, async () => {
    console.log("API running on port 4000");
});