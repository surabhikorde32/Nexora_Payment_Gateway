
import * as Yup from "yup"

        
// Validation schema
export const SignupSchema = Yup.object().shape({
  full_name: Yup.string()
    .required("Name is required")
    .min(2, "Name must be at least 2 characters")
    .max(50, "Name must be less than 50 characters"),
  email: Yup.string()
    .required("Email is required")
    .matches(
      /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
      "Please enter valid email address"
    ),
  password: Yup.string()
    .required("Password is required")
    .matches(
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/,
        "Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character (@$!%*?&)"
    )
    .min(8, "Password must be at least 8 characters long")
    .max(12, "Password must be less than 12 characters"),
  terms: Yup.boolean()
    .required("You must accept the terms and conditions")
    .oneOf([true], "You must accept the terms and conditions")
})


export const RecoverPasswordSchema = Yup.object().shape({
  email: Yup.string()
    .required("Email is required")
    .matches(
      /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
      "Please enter a valid email address"
    ),
  password: Yup.string()
    .required("Password is required")
    .matches(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/,
      "Password must contain at least one uppercase, one lowercase, one number, and one special character (@$!%*?&)"
    )
    .min(8, "Password must be at least 8 characters")
    .max(12, "Password must be less than 12 characters"),
  mnemonic: Yup.string()
    .required("Recovery phrase is required")
    .test("word-count", "Recovery phrase must be exactly 12 words", (value) =>
      value ? value.trim().split(/\s+/).filter(Boolean).length === 12 : false
    ),
})

export const SendSchema = Yup.object().shape({
  toAddress: Yup.string()
    .required("Recipient address is required")
    .matches(/^0x[a-fA-F0-9]{40}$/, "Must be a valid Ethereum address (0x...)"),
  amount: Yup.number()
    .typeError("Amount must be a number")
    .required("Amount is required")
    .positive("Amount must be greater than 0")
    .max(100, "Amount cannot exceed 100 ETH per transaction"),
  note: Yup.string().max(100, "Note must be less than 100 characters"),
})

export const SendPasswordSchema = Yup.object().shape({
  password: Yup.string().required("Password is required to confirm transaction"),
})

export const LoginSchema = Yup.object().shape({
    email: Yup.string()
    .required("Email is required")
    .matches(
      /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
      "Please enter valid email address"
    ),
  password: Yup.string().required("Password is required"),
})
