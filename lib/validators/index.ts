import { z } from "zod";

// Placeholder Zod schemas - will be expanded in subsequent phases

export const loginSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export const registerSchema = z.object({
  full_name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Please enter a valid email address"),
  phone: z.string().min(10, "Please enter a valid phone number"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  role: z.enum(["farmer", "buyer", "agent"]),
  location: z.string().min(2, "Location is required"),
  
  // Role specific fields (optional in base schema, validated conditionally or in UI)
  farm_name: z.string().optional(),
  farm_location: z.string().optional(),
  business_name: z.string().optional(),
  delivery_address: z.string().optional(),
  vehicle_type: z.string().optional(),
  coverage_area: z.string().optional(),
}).superRefine((data, ctx) => {
  if (data.role === "farmer") {
    if (!data.farm_name) ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Farm name is required", path: ["farm_name"] });
    if (!data.farm_location) ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Farm location is required", path: ["farm_location"] });
  } else if (data.role === "buyer") {
    if (!data.business_name) ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Business name is required", path: ["business_name"] });
    if (!data.delivery_address) ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Delivery address is required", path: ["delivery_address"] });
  } else if (data.role === "agent") {
    if (!data.vehicle_type) ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Vehicle type is required", path: ["vehicle_type"] });
    if (!data.coverage_area) ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Coverage area is required", path: ["coverage_area"] });
  }
});

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;

export const productSchema = z.object({
  name: z.string().min(2, "Product name must be at least 2 characters"),
  crop_type: z.string().min(2, "Crop type is required"),
  quantity: z.coerce.number().positive("Quantity must be greater than 0"),
  unit: z.string().min(1, "Unit is required"),
  price: z.coerce.number().positive("Price must be greater than 0"),
  harvest_date: z.string().refine((date) => {
    // Basic check to ensure date is valid and not far past
    const parsedDate = new Date(date);
    const minDate = new Date("2020-01-01");
    return parsedDate >= minDate;
  }, "Invalid harvest date"),
  location: z.string().min(2, "Location is required"),
  images: z.array(
    z.object({
      file: z.any().optional(), // File object (client only)
      path: z.string().optional(), // Storage path (server response)
      is_primary: z.boolean().default(false),
    })
  ).min(1, "At least one product image is required"),
});

export type ProductInput = z.infer<typeof productSchema>;
