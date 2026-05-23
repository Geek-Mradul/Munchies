import express from "express";
import cors from "cors";

const app = express();

app.use(cors());
app.use(express.json());

const stores = [
    {
        id: "1",
        name: "Maggi Point",
        hostel: "BH-1",
        room: "101",
        tagline: "Late night maggi & snacks",
    },
    {
        id: "2",
        name: "Cold Coffee Corner",
        hostel: "BH-2",
        room: "212",
        tagline: "Best cold coffee in hostel",
    },
];

const items = [
    {
        id: 1,
        storeId: "1",
        name: "Veg Maggi",
        price: 40,
    },
    {
        id: 2,
        storeId: "1",
        name: "Cheese Maggi",
        price: 60,
    },
    {
        id: 3,
        storeId: "2",
        name: "Cold Coffee",
        price: 50,
    },
];

app.get("/stores", (req, res) => {
    res.json(stores);
});

app.get("/stores/:id", (req, res) => {
    const store = stores.find((item) => item.id === req.params.id);

    if (!store) {
        return res.status(404).json({ message: "Store not found" });
    }

    res.json(store);
});

app.get("/stores/:id/items", (req, res) => {
    const storeItems = items.filter(
        (item) => item.storeId === req.params.id
    );

    res.json(storeItems);
});

app.listen(4000, () => {
    console.log("API running on port 4000");
});