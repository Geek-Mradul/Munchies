import { prisma } from "./prisma";
import { sendEmail } from "./email";

let schedulerInterval: NodeJS.Timeout | null = null;

export async function checkUncollectedOrders() {
    try {
        const thresholdDate = new Date(Date.now() - 24 * 60 * 60 * 1000); // 24 hours ago

        // Query all uncollected (status READY) orders older than 24 hours
        const uncollectedBookings = await prisma.booking.findMany({
            where: {
                status: "READY",
                readyAt: {
                    not: null,
                    lt: thresholdDate,
                },
            },
            include: {
                user: true,
                store: true,
            },
        });

        if (uncollectedBookings.length === 0) {
            return;
        }

        console.log(`[Scheduler] Found ${uncollectedBookings.length} expired READY bookings to cancel.`);

        for (const booking of uncollectedBookings) {
            const user = booking.user;

            // Execute atomic transaction for cancellation, warning increment, and auto-blocking
            const updatedUser = await prisma.$transaction(async (tx) => {
                // Cancel the booking
                await tx.booking.update({
                    where: { id: booking.id },
                    data: { status: "CANCELLED" },
                });

                // Increment user warnings count
                const nextWarningsCount = user.warningsCount + 1;
                const shouldBlock = nextWarningsCount >= 3;

                const u = await tx.user.update({
                    where: { id: user.id },
                    data: {
                        warningsCount: { increment: 1 },
                        isBlocked: shouldBlock ? true : undefined, // set true if 3 or more warnings
                    },
                });

                return u;
            });

            console.log(`[Scheduler] Booking ${booking.id} cancelled. User ${user.email} warning count updated to ${updatedUser.warningsCount}.`);

            // Dispatch warning email asynchronously
            const warningsLeft = Math.max(0, 3 - updatedUser.warningsCount);
            const isBlockedNow = updatedUser.isBlocked;

            let emailSubject = `[Warning #${updatedUser.warningsCount}] Uncollected Order Cancellation - Munchies`;
            let emailHtml = `
                <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #fed7aa; border-radius: 16px; background-color: #fffaf5;">
                    <h2 style="color: #ea580c; margin-top: 0;">Munchies Warning Notice</h2>
                    <p>Dear ${user.firstName || "Customer"},</p>
                    <p>Your order <strong>#${booking.orderNumber || booking.id.slice(0, 8).toUpperCase()}</strong> at <strong>${booking.store.name}</strong> was marked <strong>Ready</strong> but remained uncollected for over 24 hours.</p>
                    <p style="color: #b91c1c; font-weight: bold;">Pursuant to our Uncollected Order Policy, this order has been automatically cancelled and a warning has been assigned to your account.</p>
                    <div style="background-color: #ffedd5; border-left: 4px solid #ea580c; padding: 12px; margin: 16px 0; border-radius: 4px;">
                        <p style="margin: 0; font-weight: bold; color: #7c2d12;">Active Warnings: ${updatedUser.warningsCount} / 3</p>
                        <p style="margin: 4px 0 0 0; font-size: 13px; color: #7c2d12;">You have <strong>${warningsLeft}</strong> warning(s) remaining before your account is automatically blocked from placing new orders.</p>
                    </div>
                    <p style="font-size: 12px; color: #6b7280; margin-top: 24px; border-t: 1px solid #fed7aa; pt: 12px;">This is an automated policy enforcement notification from Munchies. Please make sure to collect your orders promptly.</p>
                </div>
            `;

            if (isBlockedNow) {
                emailSubject = `[ACCOUNT BLOCKED] Policy Violation Enforcement - Munchies`;
                emailHtml = `
                    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #fca5a5; border-radius: 16px; background-color: #fef2f2;">
                        <h2 style="color: #dc2626; margin-top: 0;">Munchies Account Suspension</h2>
                        <p>Dear ${user.firstName || "Customer"},</p>
                        <p>Your order <strong>#${booking.orderNumber || booking.id.slice(0, 8).toUpperCase()}</strong> at <strong>${booking.store.name}</strong> was marked Ready but remained uncollected for over 24 hours.</p>
                        <div style="background-color: #fee2e2; border-left: 4px solid #dc2626; padding: 12px; margin: 16px 0; border-radius: 4px;">
                            <p style="margin: 0; font-weight: bold; color: #7f1d1d;">Suspension Triggered: 3 Active Warnings Reached</p>
                            <p style="margin: 4px 0 0 0; font-size: 13px; color: #7f1d1d;">Your account has been automatically suspended/blocked globally from placing any new orders on the Munchies platform.</p>
                        </div>
                        <p>To appeal this block, please contact the administrator support desk.</p>
                        <p style="font-size: 12px; color: #6b7280; margin-top: 24px; border-t: 1px solid #fca5a5; pt: 12px;">This is an automated policy suspension enforcement from Munchies.</p>
                    </div>
                `;
            }

            if (updatedUser.prefBookingNotifications) {
                sendEmail({
                    to: user.email,
                    subject: emailSubject,
                    html: emailHtml,
                }).catch((err) => console.error(`[Scheduler] Failed to send email to ${user.email}:`, err));
            }
        }
    } catch (error) {
        console.error("[Scheduler] Error running uncollected orders check:", error);
    }
}

export async function checkSaleCampaigns() {
    try {
        const now = new Date();

        // Fetch all campaigns to perform evaluation in JS
        const campaigns = await prisma.saleCampaign.findMany();

        const toActivate: string[] = [];
        const toDeactivate: string[] = [];

        for (const c of campaigns) {
            const shouldBeActive =
                now >= c.startDate &&
                now <= c.endDate &&
                (c.globalLimit === null || c.usedCount < c.globalLimit);

            if (shouldBeActive && !c.isActive) {
                toActivate.push(c.id);
            } else if (!shouldBeActive && c.isActive) {
                toDeactivate.push(c.id);
            }
        }

        if (toActivate.length > 0) {
            await prisma.saleCampaign.updateMany({
                where: { id: { in: toActivate } },
                data: { isActive: true },
            });
            console.log(`[Scheduler] Activated ${toActivate.length} campaign(s).`);
        }

        if (toDeactivate.length > 0) {
            await prisma.saleCampaign.updateMany({
                where: { id: { in: toDeactivate } },
                data: { isActive: false },
            });
            console.log(`[Scheduler] Deactivated ${toDeactivate.length} campaign(s).`);
        }
    } catch (error) {
        console.error("[Scheduler] Error running campaigns scheduling check:", error);
    }
}

export function startScheduler(intervalMs = 60 * 1000) {
    if (schedulerInterval) {
        clearInterval(schedulerInterval);
    }
    
    // Run immediately on boot
    checkUncollectedOrders();
    checkSaleCampaigns();
    
    // Setup periodic task
    schedulerInterval = setInterval(async () => {
        await checkUncollectedOrders();
        await checkSaleCampaigns();
    }, intervalMs);
    console.log(`[Scheduler] Background daemons started successfully. (Interval: ${intervalMs}ms)`);
}

export function stopScheduler() {
    if (schedulerInterval) {
        clearInterval(schedulerInterval);
        schedulerInterval = null;
        console.log("[Scheduler] Background daemons stopped.");
    }
}
