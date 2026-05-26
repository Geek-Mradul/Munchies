import express from "express";
import cors from "cors";
import { prisma } from "./lib/prisma";
import authRoutes from "./routes/auth";
import {
    requireAuth,
    requireRole,
} from "./middleware/auth";

const app = express();

app.use(cors());
app.use(express.json());
app.use("/auth", authRoutes);

function mapStore(store: { id: string; name: string; hostel: string; roomNumber: string }) {
    return {
        id: store.id,
        name: store.name,
        hostel: store.hostel,
        room: store.roomNumber,
        tagline: "",
    };
}

function mapItem(item: { id: string; storeId: string; name: string; price: number }) {
    return {
        id: item.id,
        storeId: item.storeId,
        name: item.name,
        price: item.price,
    };
}

app.get("/stores", async (req, res) => {
    const stores = await prisma.store.findMany({
        orderBy: {
            name: "asc",
        },
    });

    res.json(stores.map(mapStore));
});

app.get("/stores/:id", async (req, res) => {
    const store = await prisma.store.findUnique({
        where: {
            id: req.params.id,
        },
    });

    if (!store) {
        return res.status(404).json({ message: "Store not found" });
    }

    res.json(mapStore(store));
});

app.get("/stores/:id/items", async (req, res) => {
    const storeItems = await prisma.item.findMany({
        where: {
            storeId: req.params.id,
        },
        orderBy: {
            name: "asc",
        },
    });

    res.json(storeItems.map(mapItem));
});

app.get(
    "/protected",
    requireAuth,
    (req, res) => {
        res.json({
            message:
                "You are authenticated",
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