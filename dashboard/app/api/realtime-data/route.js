import { NextResponse } from "next/server";
import { readFile } from "fs/promises";
import path from "path";

const PRIMARY_PATH = path.join(process.cwd(), "public", "realtime", "data_latest.json");
const FALLBACK_PATH = path.join(process.cwd(), "public", "data.json");

async function readJson(filePath) {
    const raw = await readFile(filePath, "utf-8");
    return JSON.parse(raw);
}

export async function GET() {
    try {
        const primary = await readJson(PRIMARY_PATH);
        return NextResponse.json({
            ...primary,
            _meta: {
                source: "realtime",
                servedAt: new Date().toISOString(),
            },
        });
    } catch {
        try {
            const fallback = await readJson(FALLBACK_PATH);
            return NextResponse.json({
                ...fallback,
                _meta: {
                    source: "fallback-json",
                    servedAt: new Date().toISOString(),
                },
            });
        } catch (error) {
            return NextResponse.json(
                {
                    error: "Unable to load realtime or fallback dashboard data",
                    detail: String(error?.message || error),
                },
                { status: 500 }
            );
        }
    }
}

