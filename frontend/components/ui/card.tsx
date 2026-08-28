import * as React from "react"
import { cn } from "@/lib/utils"
export function Card({className, ...p}: React.HTMLAttributes<HTMLDivElement>) { return <div className={cn("bg-[#0f172a] border border-[#1e293b] rounded-xl", className)} {...p} /> }
export function CardHeader({className, ...p}: React.HTMLAttributes<HTMLDivElement>) { return <div className={cn("p-4 border-b border-[#1e293b]", className)} {...p} /> }
export function CardTitle({className, ...p}: React.HTMLAttributes<HTMLHeadingElement>) { return <h3 className={cn("text-xs font-bold tracking-widest text-white", className)} {...p} /> }
export function CardContent({className, ...p}: React.HTMLAttributes<HTMLDivElement>) { return <div className={cn("p-4", className)} {...p} /> }
