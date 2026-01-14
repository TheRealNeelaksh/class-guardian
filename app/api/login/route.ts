import { NextResponse } from "next/server";
import { compare } from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { isRoastMode } from "@/lib/auth-utils";

export async function POST(req: Request) {
    try {
        const { email, pin } = await req.json();

        if (!email || !pin) {
            return NextResponse.json(
                { ok: false, error: "Missing credentials." },
                { status: 400 }
            );
        }

        const normalizedEmail = email.trim().toLowerCase();

        const user = await prisma.user.findUnique({
            where: { email: normalizedEmail },
        });

        if (!user) {
            return NextResponse.json(
                { ok: false, error: "No account found for that email." },
                { status: 401 }
            );
        }

        const isMatch = await compare(pin, user.pinHash);

        if (!isMatch) {
            return NextResponse.json(
                {
                    ok: false,
                    error: isRoastMode(user)
                        ? "Bruh. You forgot your own PIN?"
                        : "Wrong PIN. Try again.",
                },
                { status: 401 }
            );
        }

        const response = NextResponse.json({
            ok: true,
            user: {
                id: user.id,
                email: user.email,
                toneMode: user.toneMode,
                createdAt: user.createdAt.getTime(),
            },
        });

        // Set HTTP-only cookie for middleware auth
        response.cookies.set('userId', user.id, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            path: '/',
            maxAge: 60 * 60 * 24 * 7, // 7 days
        });

        return response;
    } catch (err) {
        console.error("Login API error:", err);
        return NextResponse.json(
            { ok: false, error: "Could not sign in. Please try again." },
            { status: 500 }
        );
    }
}
