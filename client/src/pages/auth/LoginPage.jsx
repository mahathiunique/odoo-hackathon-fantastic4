import { useState } from "react";
import { Eye, EyeOff, PackageCheck, ShieldCheck } from "lucide-react";
import { useForm } from "react-hook-form";
import { Navigate, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import useAuth from "../../hooks/useAuth";
import { emailPattern } from "../../utils/validators";

const demos = [["Admin", "admin@assetflow.com", "Admin@123"]];

export default function LoginPage() {
  const { user, login, isLoading } = useAuth();
  const nav = useNavigate();
  const [show, setShow] = useState(false);
  const [serverError, setServerError] = useState("");
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({ defaultValues: { remember: true } });

  if (user) return <Navigate to="/dashboard" replace />;

  const submit = async (data) => {
    try {
      setServerError("");
      await login(data.email, data.password, data.remember);
      toast.success("Welcome back to AssetFlow");
      nav("/dashboard");
    } catch (error) {
      const message =
        error.response?.data?.message || "Unable to sign in right now";
      setServerError(message);
      toast.error(message);
    }
  };

  if (isLoading) {
    return null;
  }

  return (
    <main className="min-h-screen bg-slate-950 lg:grid lg:grid-cols-2">
      <section className="hidden flex-col justify-between overflow-hidden bg-gradient-to-br from-primary-900 via-indigo-900 to-slate-950 p-12 text-white lg:flex">
        <div className="flex items-center gap-3">
          <span className="grid h-11 w-11 place-items-center rounded-xl bg-white/15 font-black">
            AF
          </span>
          <b className="text-xl">AssetFlow</b>
        </div>
        <div className="max-w-xl">
          <span className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-sm">
            <ShieldCheck size={16} /> Enterprise operations, simplified
          </span>
          <h1 className="text-5xl font-bold leading-tight">
            Know where every asset is—and what it needs next.
          </h1>
          <p className="mt-6 text-lg leading-8 text-indigo-100">
            A single workspace for asset lifecycle, shared resources,
            maintenance, allocation and audit readiness.
          </p>
        </div>
        <p className="text-sm text-indigo-200">
          Realtime authentication with secure backend access
        </p>
      </section>
      <section className="flex min-h-screen items-center justify-center p-5">
        <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl sm:p-8">
          <div className="mb-7 lg:hidden">
            <div className="mb-3 flex items-center gap-2 text-xl font-bold text-slate-900">
              <PackageCheck className="text-primary-600" /> AssetFlow
            </div>
          </div>
          <p className="text-sm font-semibold text-primary-600">WELCOME BACK</p>
          <h2 className="mt-1 text-3xl font-bold tracking-tight text-slate-900">
            Sign in to your workspace
          </h2>
          <p className="mt-2 text-sm text-slate-500">
            Use your real account credentials to access the system.
          </p>
          <form onSubmit={handleSubmit(submit)} className="mt-7 space-y-4">
            {serverError && (
              <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
                {serverError}
              </div>
            )}
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Email address
              </label>
              <input
                className="field"
                type="email"
                placeholder="name@company.com"
                {...register("email", {
                  required: "Email is required",
                  pattern: emailPattern,
                })}
              />
              {errors.email && (
                <p className="mt-1 text-sm text-rose-600">
                  {errors.email.message}
                </p>
              )}
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Password
              </label>
              <div className="relative">
                <input
                  className="field pr-12"
                  type={show ? "text" : "password"}
                  placeholder="Enter your password"
                  {...register("password", {
                    required: "Password is required",
                  })}
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
                  onClick={() => setShow((value) => !value)}
                >
                  {show ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              {errors.password && (
                <p className="mt-1 text-sm text-rose-600">
                  {errors.password.message}
                </p>
              )}
            </div>
            <label className="flex items-center gap-2 text-sm text-slate-600">
              <input type="checkbox" {...register("remember")} />
              Keep me signed in
            </label>
            <button className="btn-primary w-full" disabled={isSubmitting}>
              {isSubmitting ? "Signing in…" : "Sign in"}
            </button>
          </form>
        </div>
      </section>
    </main>
  );
}
