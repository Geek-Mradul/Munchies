import { PrismaClient, Role } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
    console.log("Cleaning up existing database records...");
    await prisma.bookingItem.deleteMany();
    await prisma.booking.deleteMany();
    await prisma.cartItem.deleteMany();
    await prisma.cart.deleteMany();
    await prisma.item.deleteMany();
    await prisma.saleCampaign.deleteMany();
    await prisma.store.deleteMany();
    await prisma.storeOwnerRequest.deleteMany();
    await prisma.user.deleteMany();

    console.log("Creating baseline users...");
    const hashedPassword = await bcrypt.hash("password", 10);

    const [admin, ownerOne, ownerTwo, ownerThree, userOne, userTwo, userThree, userFour, userFive, userSix] =
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

            prisma.user.create({
                data: {
                    email: "owner3@munchies.com",
                    passwordHash: hashedPassword,
                    firstName: "Vikram",
                    role: Role.STORE_OWNER,
                },
            }),

            prisma.user.create({
                data: {
                    email: "user1@munchies.com",
                    passwordHash: hashedPassword,
                    firstName: "Rahul",
                    role: Role.USER,
                },
            }),

            prisma.user.create({
                data: {
                    email: "user2@munchies.com",
                    passwordHash: hashedPassword,
                    firstName: "Sneha",
                    role: Role.USER,
                },
            }),

            prisma.user.create({
                data: {
                    email: "user3@munchies.com",
                    passwordHash: hashedPassword,
                    firstName: "Aman",
                    role: Role.USER,
                },
            }),

            prisma.user.create({
                data: {
                    email: "user4@munchies.com",
                    passwordHash: hashedPassword,
                    firstName: "Priya",
                    role: Role.USER,
                },
            }),

            prisma.user.create({
                data: {
                    email: "user5@munchies.com",
                    passwordHash: hashedPassword,
                    firstName: "Karan",
                    role: Role.USER,
                },
            }),

            prisma.user.create({
                data: {
                    email: "user6@munchies.com",
                    passwordHash: hashedPassword,
                    firstName: "Divya",
                    role: Role.USER,
                },
            }),
        ]);

    console.log("Creating store branches with hostel wings...");
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
                name: "Lays Hub",
                hostel: "BH-2",
                roomNumber: "214",
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

        prisma.store.create({
            data: {
                name: "Chai Chaska",
                hostel: "BH-4",
                roomNumber: "402",
                ownerId: ownerThree.id,
            },
        }),
    ]);

    console.log("Creating item menus with high-resolution Unsplash food images...");
    const items = await Promise.all([
        // Store 0: Maggi Point
        prisma.item.create({
            data: {
                name: "Classic Veg Maggi",
                price: 40,
                imageUrl: "https://images.unsplash.com/photo-1612927601601-6638404737ce?auto=format&fit=crop&w=600&q=80",
                stockQuantity: 25,
                storeId: stores[0].id,
            },
        }),
        prisma.item.create({
            data: {
                name: "Double Cheese Maggi",
                price: 60,
                imageUrl: "https://images.unsplash.com/photo-1551183053-bf91a1d81141?auto=format&fit=crop&w=600&q=80",
                stockQuantity: 15,
                storeId: stores[0].id,
            },
        }),
        prisma.item.create({
            data: {
                name: "Spicy Schezwan Noodles",
                price: 50,
                imageUrl: "https://images.unsplash.com/photo-1585032226651-759b368d7246?auto=format&fit=crop&w=600&q=80",
                stockQuantity: 30,
                storeId: stores[0].id,
            },
        }),

        // Store 1: Lays Hub
        prisma.item.create({
            data: {
                name: "Lays Magic Masala",
                price: 15,
                imageUrl: "https://images.unsplash.com/photo-1566478989037-eec170784d0b?auto=format&fit=crop&w=600&q=80",
                stockQuantity: 50,
                storeId: stores[1].id,
            },
        }),
        prisma.item.create({
            data: {
                name: "Creamy Iced Latte",
                price: 55,
                imageUrl: "https://images.unsplash.com/photo-1517701604599-bb29b565090c?auto=format&fit=crop&w=600&q=80",
                stockQuantity: 18,
                storeId: stores[1].id,
            },
        }),
        prisma.item.create({
            data: {
                name: "Dark Chocolate Brownie",
                price: 45,
                imageUrl: "https://images.unsplash.com/photo-1606313564200-e75d5e30476c?auto=format&fit=crop&w=600&q=80",
                stockQuantity: 2, // Low stock!
                storeId: stores[1].id,
            },
        }),

        // Store 2: Bun & Bite
        prisma.item.create({
            data: {
                name: "Veg Cheese Toast Sandwich",
                price: 65,
                imageUrl: "https://images.unsplash.com/photo-1528735602780-2552fd46c7af?auto=format&fit=crop&w=600&q=80",
                stockQuantity: 22,
                storeId: stores[2].id,
            },
        }),
        prisma.item.create({
            data: {
                name: "Paneer Tikka Roll",
                price: 75,
                imageUrl: "https://images.unsplash.com/photo-1626132647523-66f5bf380027?auto=format&fit=crop&w=600&q=80",
                stockQuantity: 1, // Low stock!
                storeId: stores[2].id,
            },
        }),
        prisma.item.create({
            data: {
                name: "Crispy Aloo Tikki Burger",
                price: 50,
                imageUrl: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=600&q=80",
                stockQuantity: 15,
                storeId: stores[2].id,
            },
        }),

        // Store 3: Fresh Juice Hub
        prisma.item.create({
            data: {
                name: "Fresh Orange Juice",
                price: 45,
                imageUrl: "https://images.unsplash.com/photo-1613478223719-2ab802602423?auto=format&fit=crop&w=600&q=80",
                stockQuantity: 25,
                storeId: stores[3].id,
            },
        }),
        prisma.item.create({
            data: {
                name: "Mint Watermelon Cooler",
                price: 55,
                imageUrl: "https://images.unsplash.com/photo-1508891040854-47c1abf81b16?auto=format&fit=crop&w=600&q=80",
                stockQuantity: 22,
                storeId: stores[3].id,
            },
        }),

        // Store 4: Tiffin Trails
        prisma.item.create({
            data: {
                name: "Special Veg Thali",
                price: 110,
                imageUrl: "https://images.unsplash.com/photo-1546833999-b9f581a1996d?auto=format&fit=crop&w=600&q=80",
                stockQuantity: 8,
                storeId: stores[4].id,
            },
        }),
        prisma.item.create({
            data: {
                name: "Homestyle Dal Rice Bowl",
                price: 85,
                imageUrl: "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=600&q=80",
                stockQuantity: 14,
                storeId: stores[4].id,
            },
        }),

        // Store 5: Chai Chaska
        prisma.item.create({
            data: {
                name: "Adrak Elaichi Chai",
                price: 15,
                imageUrl: "https://images.unsplash.com/photo-1576092768241-dec231879fc3?auto=format&fit=crop&w=600&q=80",
                stockQuantity: 40,
                storeId: stores[5].id,
            },
        }),
        prisma.item.create({
            data: {
                name: "Samosa Plate (2 Pcs)",
                price: 30,
                imageUrl: "https://images.unsplash.com/photo-1601050690597-df056fb4ce78?auto=format&fit=crop&w=600&q=80",
                stockQuantity: 18,
                storeId: stores[5].id,
            },
        }),
    ]);

    console.log("Creating active sale campaigns...");
    const seededCampaigns = await Promise.all([
        prisma.saleCampaign.create({
            data: {
                storeId: stores[0].id, // Maggi Point
                code: "SAVE20",
                discountType: "PERCENTAGE",
                discountValue: 20,
                startDate: new Date(Date.now() - 24 * 60 * 60 * 1000), // Active since yesterday
                endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // Active for 30 days
                minOrderValue: 50,
                globalLimit: 100,
                perUserLimit: 2,
                isActive: true,
            },
        }),
        prisma.saleCampaign.create({
            data: {
                storeId: stores[0].id, // Maggi Point
                code: "FLAT15",
                discountType: "FLAT",
                discountValue: 15,
                startDate: new Date(Date.now() - 24 * 60 * 60 * 1000),
                endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
                minOrderValue: 80,
                globalLimit: 50,
                perUserLimit: 1,
                isActive: true,
            },
        }),
        prisma.saleCampaign.create({
            data: {
                storeId: stores[2].id, // Bun & Bite
                code: "BUNCHEAP",
                discountType: "PERCENTAGE",
                discountValue: 10,
                startDate: new Date(Date.now() - 24 * 60 * 60 * 1000),
                endDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000),
                minOrderValue: 40,
                globalLimit: 200,
                perUserLimit: 3,
                isActive: true,
            },
        }),
    ]);

    console.log("Creating owner dashboard requests (Approvals ecosystem)...");
    await prisma.storeOwnerRequest.createMany({
        data: [
            {
                userId: userOne.id,
                status: "PENDING",
            },
            {
                userId: userTwo.id,
                status: "PENDING",
            },
            {
                userId: userThree.id,
                status: "REJECTED",
            },
            {
                userId: userFour.id,
                status: "APPROVED",
            },
        ],
    });

    console.log("Creating active carts...");
    const cart = await prisma.cart.create({
        data: {
            userId: userOne.id,
            storeId: stores[0].id,
        },
    });

    await prisma.cartItem.create({
        data: {
            cartId: cart.id,
            itemId: items[0].id, // Veg Maggi
            quantity: 2,
        },
    });

    console.log("Creating comprehensive, sequential live orders with diverse status loops...");
    // Let's seed orders spanning PLACED, ACCEPTED, READY, COMPLETED, REJECTED
    const orderData = [
        {
            orderNumber: "A01",
            userId: userTwo.id,
            storeId: stores[0].id,
            totalAmount: items[0].price * 3, // Veg Maggi x3
            status: "PLACED" as const,
            items: [{ itemId: items[0].id, quantity: 3, unitPrice: items[0].price }],
        },
        {
            orderNumber: "A02",
            userId: userThree.id,
            storeId: stores[0].id,
            totalAmount: items[1].price * 1 + items[2].price * 2, // Cheese Maggi x1 + Spicy Noodles x2
            status: "ACCEPTED" as const, // Preparing
            items: [
                { itemId: items[1].id, quantity: 1, unitPrice: items[1].price },
                { itemId: items[2].id, quantity: 2, unitPrice: items[2].price },
            ],
        },
        {
            orderNumber: "A03",
            userId: userFour.id,
            storeId: stores[0].id,
            totalAmount: items[0].price * 2, // Veg Maggi x2
            status: "READY" as const, // Ready to Collect
            items: [{ itemId: items[0].id, quantity: 2, unitPrice: items[0].price }],
        },
        {
            orderNumber: "A04",
            userId: userFive.id,
            storeId: stores[2].id, // Bun & Bite
            totalAmount: items[6].price * 2 + items[8].price * 1, // Sandwich x2 + Burger x1
            status: "PLACED" as const,
            items: [
                { itemId: items[6].id, quantity: 2, unitPrice: items[6].price },
                { itemId: items[8].id, quantity: 1, unitPrice: items[8].price },
            ],
        },
        {
            orderNumber: "A05",
            userId: userSix.id,
            storeId: stores[2].id, // Bun & Bite
            totalAmount: items[7].price * 2, // Paneer Roll x2
            status: "READY" as const, // Ready to Collect
            items: [{ itemId: items[7].id, quantity: 2, unitPrice: items[7].price }],
        },
        {
            orderNumber: "A06",
            userId: userTwo.id,
            storeId: stores[2].id, // Bun & Bite
            totalAmount: items[6].price * 1, // Sandwich x1
            status: "COMPLETED" as const, // Finished
            items: [{ itemId: items[6].id, quantity: 1, unitPrice: items[6].price }],
        },
        {
            orderNumber: "A07",
            userId: userThree.id,
            storeId: stores[2].id, // Bun & Bite
            totalAmount: items[8].price * 3, // Burger x3
            status: "REJECTED" as const, // Cancelled
            items: [{ itemId: items[8].id, quantity: 3, unitPrice: items[8].price }],
        },
    ];

    for (const data of orderData) {
        const booking = await prisma.booking.create({
            data: {
                orderNumber: data.orderNumber,
                userId: data.userId,
                storeId: data.storeId,
                totalAmount: data.totalAmount,
                status: data.status,
            },
        });

        for (const line of data.items) {
            await prisma.bookingItem.create({
                data: {
                    bookingId: booking.id,
                    itemId: line.itemId,
                    quantity: line.quantity,
                    unitPrice: line.unitPrice,
                },
            });
        }
    }

    console.log("\nDatabase successfully seeded with rich visual data loops!");
    console.log("=========================================================");
    console.log("Demo Credentials (all password: 'password'):");
    console.log(`🔑 Admin Access        : ${admin.email}`);
    console.log(`🔑 Store Owner (Ravi)  : ${ownerOne.email}`);
    console.log(`🔑 Store Owner (Neha)  : ${ownerTwo.email}`);
    console.log(`🔑 Store Owner (Vikram): ${ownerThree.email}`);
    console.log(`🔑 Campus User (Rahul) : ${userOne.email}`);
    console.log(`🔑 Campus User (Sneha) : ${userTwo.email}`);
    console.log(`🔑 Campus User (Aman)  : ${userThree.email}`);
    console.log("=========================================================");
}

main()
    .catch((e) => {
        console.error("Database seed failed with error:", e);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });