import * as React from "react"
import { cn } from "@/lib/utils"
export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(({className, ...props}, ref)=>
  <input ref={ref} className={cn("flex h-9 w-full rounded-lg border border-[#1e293b] bg-[#020617] px-3 py-2 text-sm placeholder:text-[#64748b] focus:outline-none focus:ring-1 focus:ring-[#00ff88]", className)} {...props} />
)
Input.displayName="Input"
