import { PrismaClient, Role } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
    await prisma.bookingItem.deleteMany();
    await prisma.booking.deleteMany();
    await prisma.cartItem.deleteMany();
    await prisma.cart.deleteMany();
    await prisma.item.deleteMany();
    await prisma.store.deleteMany();
    await prisma.storeOwnerRequest.deleteMany();
    await prisma.user.deleteMany();

    const hashedPassword = await bcrypt.hash(
        "password",
        10
    );

    const [admin, ownerOne, ownerTwo] =
        await Promise.all([
            prisma.user.create({
                data: {
                    email: "admin@munchies.com",
                    passwordHash: hashedPassword,
                    firstName: "Admin",
                    role: Role.ADMIN,
                },
            }),

            prisma.user.create({
                data: {
                    email: "owner1@munchies.com",
                    passwordHash: hashedPassword,
                    firstName: "Ravi",
                    role: Role.STORE_OWNER,
                },
            }),

            prisma.user.create({
                data: {
                    email: "owner2@munchies.com",
                    passwordHash: hashedPassword,
                    firstName: "Neha",
                    role: Role.STORE_OWNER,
                },
            }),
        ]);

    const stores = await Promise.all([
        prisma.store.create({
            data: {
                name: "Maggi Point",
                hostel: "BH-1",
                roomNumber: "101",
                ownerId: ownerOne.id,
            },
        }),

        prisma.store.create({
            data: {
                name: "Cold Coffee Corner",
                hostel: "BH-2",
                roomNumber: "212",
                ownerId: ownerOne.id,
            },
        }),

        prisma.store.create({
            data: {
                name: "Bun & Bite",
                hostel: "GH-1",
                roomNumber: "14",
                ownerId: ownerTwo.id,
            },
        }),

        prisma.store.create({
            data: {
                name: "Fresh Juice Hub",
                hostel: "BH-3",
                roomNumber: "09",
                ownerId: ownerTwo.id,
            },
        }),

        prisma.store.create({
            data: {
                name: "Tiffin Trails",
                hostel: "GH-2",
                roomNumber: "18",
                ownerId: ownerTwo.id,
            },
        }),
    ]);

    await prisma.item.createMany({
        data: [
            {
                name: "Veg Maggi",
                price: 40,
                imageUrl: "",
                stockQuantity: 20,
                storeId: stores[0].id,
            },

            {
                name: "Cheese Maggi",
                price: 60,
                imageUrl: "",
                stockQuantity: 15,
                storeId: stores[0].id,
            },

            {
                name: "Cold Coffee",
                price: 50,
                imageUrl: "",
                stockQuantity: 18,
                storeId: stores[1].id,
            },

            {
                name: "Veg Cheese Sandwich",
                price: 65,
                imageUrl: "",
                stockQuantity: 12,
                storeId: stores[2].id,
            },

            {
                name: "Paneer Roll",
                price: 75,
                imageUrl: "",
                stockQuantity: 10,
                storeId: stores[2].id,
            },

            {
                name: "Mosambi Juice",
                price: 45,
                imageUrl: "",
                stockQuantity: 25,
                storeId: stores[3].id,
            },

            {
                name: "Watermelon Cooler",
                price: 55,
                imageUrl: "",
                stockQuantity: 22,
                storeId: stores[3].id,
            },

            {
                name: "Veg Thali",
                price: 110,
                imageUrl: "",
                stockQuantity: 8,
                storeId: stores[4].id,
            },

            {
                name: "Dal Rice Bowl",
                price: 85,
                imageUrl: "",
                stockQuantity: 14,
                storeId: stores[4].id,
            },
        ],
    });

    console.log("Seed completed");
}

main()
    .catch((e) => {
        console.error(e);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });