import * as React from "react"
import { cn } from "@/lib/utils"
export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> { variant?: "default"|"outline"|"ghost" }
export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(({className, variant="default", ...props}, ref) => (
  <button ref={ref} className={cn(
    "inline-flex items-center justify-center rounded-lg px-4 py-2 text-sm font-semibold transition",
    variant==="default" && "bg-[#00ff88] text-black hover:bg-[#00e67a]",
    variant==="outline" && "border border-[#1e293b] bg-[#0f172a] text-white hover:bg-[#1e293b]",
    variant==="ghost" && "text-[#94a3b8] hover:text-white hover:bg-[#1e293b]",
    className
  )} {...props} />
))
Button.displayName="Button"
