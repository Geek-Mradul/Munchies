import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

type JwtPayload = {
    userId: string;
    role: string;
};

export interface AuthRequest
    extends Request {
    user?: JwtPayload;
}

export function requireAuth(
    req: AuthRequest,
    res: Response,
    next: NextFunction
) {
    const authHeader =
        req.headers.authorization;

    if (!authHeader) {
        return res.status(401).json({
            message: "Unauthorized",
        });
    }

    const token = authHeader.split(" ")[1];

    try {
        const decoded = jwt.verify(
            token,
            process.env.JWT_SECRET as string
        ) as JwtPayload;

        req.user = decoded;

        next();
    } catch {
        return res.status(401).json({
            message: "Invalid token",
        });
    }
}
export function requireRole(
    role: string
) {
    return (
        req: AuthRequest,
        res: Response,
        next: NextFunction
    ) => {
        if (!req.user) {
            return res.status(401).json({
                message: "Unauthorized",
            });
        }

        if (req.user.role !== role) {
            return res.status(403).json({
                message: "Forbidden",
            });
        }

        next();
    };
}