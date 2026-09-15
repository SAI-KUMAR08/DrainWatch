import { Router, type IRouter } from "express";
import {
  CitizenLoginBody,
  CitizenLoginResponse,
  LoginBody,
  LoginResponse,
  OfficerLoginBody,
  OfficerLoginResponse,
} from "@workspace/api-zod";
import { createSession } from "../middlewares/auth";

const router: IRouter = Router();

router.post("/auth/login", (req, res): void => {
  const parsed = LoginBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Enter a valid email and password" });
    return;
  }

  if (parsed.data.email === "resident@drainwatch.in" && parsed.data.password === "report") {
    res.json(
      LoginResponse.parse({
        token: createSession({ role: "citizen", email: parsed.data.email, name: "Hyderabad resident" }),
        role: "citizen",
        name: "Hyderabad resident",
        email: parsed.data.email,
      }),
    );
    return;
  }

  if (parsed.data.email === "control@drainwatch.in" && parsed.data.password === "watchtower") {
    res.json(
      LoginResponse.parse({
        token: createSession({ role: "officer", email: parsed.data.email, name: "Municipal response desk" }),
        role: "officer",
        name: "Municipal response desk",
        email: parsed.data.email,
      }),
    );
    return;
  }

  res.status(401).json({ error: "Invalid credentials" });
});

router.post("/auth/citizen/login", (req, res): void => {
  const parsed = CitizenLoginBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Enter a valid email and password" });
    return;
  }
  if (parsed.data.email !== "resident@drainwatch.in" || parsed.data.password !== "report") {
    res.status(401).json({ error: "Invalid citizen credentials" });
    return;
  }
  res.json(
    CitizenLoginResponse.parse({
      token: createSession({ role: "citizen", email: parsed.data.email, name: "Hyderabad resident" }),
      role: "citizen",
      name: "Hyderabad resident",
      email: parsed.data.email,
    }),
  );
});

router.post("/auth/officer/login", (req, res): void => {
  const parsed = OfficerLoginBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Enter a valid email and password" });
    return;
  }
  if (parsed.data.email !== "control@drainwatch.in" || parsed.data.password !== "watchtower") {
    res.status(401).json({ error: "Invalid officer credentials" });
    return;
  }
  res.json(
    OfficerLoginResponse.parse({
      token: createSession({ role: "officer", email: parsed.data.email, name: "Municipal response desk" }),
      role: "officer",
      name: "Municipal response desk",
      email: parsed.data.email,
    }),
  );
});

export default router;