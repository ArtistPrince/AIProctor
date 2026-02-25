"use client";

import * as React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { DayPicker } from "react-day-picker";

import { cn } from "./utils";
import { buttonVariants } from "./button";

function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  ...props
}: React.ComponentProps<typeof DayPicker>) {
  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn("w-full p-4", className)}
      classNames={{
        months: "flex w-full justify-center",
        month: "flex flex-col w-full gap-4",
        caption: "flex justify-center pt-1 relative items-center w-full",
        caption_label: "text-sm font-semibold text-white",
        nav: "flex items-center gap-1",
        nav_button: cn(
          buttonVariants({ variant: "outline" }),
          "size-7 bg-transparent text-white border-slate-700 hover:bg-slate-800 opacity-80 hover:opacity-100"
        ),
        nav_button_previous: "absolute left-1",
        nav_button_next: "absolute right-1",
        table: "w-full border-collapse",
        head_row: "flex w-full justify-between",
        head_cell:
          "text-slate-300 rounded-md w-9 font-medium text-[0.8rem]",
        row: "flex w-full justify-between mt-2",
        cell:
          "relative p-0 text-center text-sm focus-within:relative focus-within:z-20",
        day: cn(
          buttonVariants({ variant: "ghost" }),
          "size-9 p-0 font-normal text-white hover:bg-slate-700 aria-selected:opacity-100 rounded-md"
        ),
        day_selected:
          "bg-purple-600 text-white hover:bg-purple-600 focus:bg-purple-600",
        day_today: "bg-slate-700 text-white",
        day_outside: "text-slate-500 opacity-40",
        day_disabled: "text-slate-600 opacity-40",
        day_range_middle: "aria-selected:bg-slate-700 aria-selected:text-white",
        day_hidden: "invisible",
        ...classNames,
      }}
      components={{
        IconLeft: ({ className, ...props }) => (
          <ChevronLeft className={cn("size-4 text-white", className)} {...props} />
        ),
        IconRight: ({ className, ...props }) => (
          <ChevronRight className={cn("size-4 text-white", className)} {...props} />
        ),
      }}
      {...props}
    />
  );
}

export { Calendar };
