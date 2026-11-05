import { memoryDb } from "../db/pool.js"
import { generateToken, hashPassword } from "../middleware/auth.js"

export function authRoutes(router) {
  // POST /api/v1/auth/login
  router.post("/api/v1/auth/login", (req, res) => {
    const { email, password, portal } = req.body || {}
    if (!email) {
      return res
        .status(400)
        .json({
          error: { code: "VALIDATION_ERROR", message: "Email is required" },
        })
    }

    const trimmed = email.trim().toLowerCase()
    let user = memoryDb.tables.users.find(
      (u) => u.email.toLowerCase() === trimmed,
    )

    // Demo portal fallback
    if (!user && portal) {
      if (portal === "admin")
        user = memoryDb.tables.users.find((u) => u.id === "admin-1")
      else if (portal === "authority")
        user = memoryDb.tables.users.find((u) => u.id === "authority-1")
      else if (portal === "accounts")
        user = memoryDb.tables.users.find((u) => u.id === "accounts-1")
      else if (portal === "technician")
        user = memoryDb.tables.users.find((u) => u.id === "tech-1")
    }

    if (!user) {
      return res
        .status(401)
        .json({
          error: {
            code: "UNAUTHORIZED",
            message: "Invalid credentials or user not found",
          },
        })
    }

    if (!password) {
      return res
        .status(400)
        .json({
          error: { code: "VALIDATION_ERROR", message: "Password is required" },
        })
    }

    const inputHash = hashPassword(password)
    const isSeedUser =
      user.id.startsWith("admin-") ||
      user.id.startsWith("tech-") ||
      user.id.startsWith("authority-") ||
      user.id.startsWith("accounts-") ||
      user.id.startsWith("stu-")
    const validSeedPassword =
      password === "Admin@123" ||
      (user.id.startsWith("tech-") && password === "Tech@123") ||
      (user.id.startsWith("authority-") && password === "Auth@123") ||
      (user.id.startsWith("accounts-") && password === "Acct@123") ||
      (user.id.startsWith("stu-") &&
        (password === "Student@123" || password === "123456"))

    const isMatch =
      user.password_hash === inputHash || (isSeedUser && validSeedPassword)

    if (!isMatch) {
      return res
        .status(401)
        .json({
          error: { code: "UNAUTHORIZED", message: "Invalid email or password" },
        })
    }

    const token = generateToken(user)
    res.json({
      accessToken: token,
      expiresIn: 86400,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        department: user.department,
      },
    })
  })

  // POST /api/v1/auth/register
  router.post("/api/v1/auth/register", (req, res) => {
    const { fullName, studentId, email, department, role, password } =
      req.body || {}

    if (!fullName?.trim()) {
      return res
        .status(400)
        .json({
          error: { code: "VALIDATION_ERROR", message: "Full name is required" },
        })
    }
    if (!email?.trim() || !email.toLowerCase().endsWith(".edu")) {
      return res
        .status(400)
        .json({
          error: {
            code: "VALIDATION_ERROR",
            message: "Only university .edu email addresses are accepted",
          },
        })
    }
    if (!password || password.length < 6) {
      return res
        .status(400)
        .json({
          error: {
            code: "VALIDATION_ERROR",
            message: "Password must be at least 6 characters",
          },
        })
    }

    const existing = memoryDb.tables.users.find(
      (u) => u.email.toLowerCase() === email.toLowerCase(),
    )
    if (existing) {
      return res
        .status(409)
        .json({
          error: {
            code: "CONFLICT",
            message: "An account with this email already exists",
          },
        })
    }

    const newUser = {
      id: `usr-${Date.now()}`,
      name: fullName.trim(),
      email: email.trim().toLowerCase(),
      password_hash: hashPassword(password),
      role: role || "student",
      department: department || "General Engineering",
      student_id: studentId || null,
      is_active: true,
      created_at: new Date().toISOString(),
    }

    memoryDb.tables.users.push(newUser)
    const token = generateToken(newUser)

    res.status(201).json({
      message: "Account created successfully.",
      userId: newUser.id,
      accessToken: token,
      user: {
        id: newUser.id,
        name: newUser.name,
        email: newUser.email,
        role: newUser.role,
        department: newUser.department,
      },
    })
  })

  // GET /api/v1/auth/me
  router.get("/api/v1/auth/me", (req, res) => {
    if (!req.user) {
      return res
        .status(401)
        .json({
          error: { code: "UNAUTHORIZED", message: "Authentication required" },
        })
    }
    const { password_hash, ...safeUser } = req.user
    res.json(safeUser)
  })

  // POST /api/v1/auth/logout
  router.post("/api/v1/auth/logout", (req, res) => {
    res.json({ message: "Signed out successfully" })
  })
}
