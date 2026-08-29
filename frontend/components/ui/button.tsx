import * as React from "react"
import { cn } from "@/lib/utils"
export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> { variant?: "default"|"outline"|"ghost"|"secondary"; size?: "default"|"sm"|"lg" }
export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(({className, variant="default", size="default", ...props}, ref) => (
  <button ref={ref} className={cn(
    "inline-flex items-center justify-center rounded-lg text-sm font-semibold transition",
    size==="default" && "px-4 py-2",
    size==="sm" && "px-2.5 py-1 text-xs",
    size==="lg" && "px-6 py-3 text-base",
    variant==="default" && "bg-[#00ff88] text-black hover:bg-[#00e67a]",
    variant==="outline" && "border border-[#1e293b] bg-[#0f172a] text-white hover:bg-[#1e293b]",
    variant==="ghost" && "text-[#94a3b8] hover:text-white hover:bg-[#1e293b]",
    variant==="secondary" && "bg-[#1e293b] text-white border border-[#334155] hover:bg-[#334155]",
    className
  )} {...props} />
))
Button.displayName="Button"
