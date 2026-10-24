import React from "react";
import { Code2, GraduationCap, Heart, Users } from "lucide-react";

const developers = ["Bhumika Pawar", "Kashish Raj Prajapati"];

export const Developer: React.FC = () => {
  return (
    <main className="mx-auto w-full max-w-6xl space-y-10 pb-16">
      <header className="space-y-3 pt-6 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-600 text-white shadow-lg shadow-indigo-600/20">
          <Code2 className="h-7 w-7" />
        </div>
        <p className="text-xs font-bold uppercase tracking-[0.25em] text-indigo-600 dark:text-indigo-400">
          LabNEXUS · University Portal
        </p>
        <h1 className="text-4xl font-black tracking-tight text-slate-900 dark:text-white sm:text-5xl">
          Meet the Developers
        </h1>
        <p className="mx-auto max-w-2xl text-base text-slate-600 dark:text-slate-400 sm:text-lg">
          Built by CSBS students to support laboratory work and assessments.
        </p>
      </header>

      <section aria-label="Development team" className="grid gap-5 md:grid-cols-2">
        {developers.map((name, index) => (
          <article
            key={name}
            className="portal-card flex items-center gap-5 overflow-hidden border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-8"
          >
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-indigo-100 text-xl font-black text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300 sm:h-20 sm:w-20 sm:text-2xl">
              {index === 0 ? "BP" : "KP"}
            </div>
            <div className="min-w-0">
              <p className="mb-1 text-xs font-bold uppercase tracking-[0.16em] text-indigo-600 dark:text-indigo-400">
                Developer {index + 1}
              </p>
              <h2 className="text-xl font-black text-slate-900 dark:text-white sm:text-2xl">
                {name}
              </h2>
              <p className="mt-2 text-sm font-medium text-slate-600 dark:text-slate-400">
                Second-year student · CSBS
              </p>
            </div>
          </article>
        ))}
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <article className="portal-card space-y-5 border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900 sm:p-8">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
              <GraduationCap className="h-6 w-6" />
            </div>
            <h2 className="text-xl font-black text-slate-900 dark:text-white">Education</h2>
          </div>
          <div className="rounded-2xl bg-slate-50 p-5 dark:bg-slate-800/60">
            <h3 className="font-bold text-slate-900 dark:text-white">
              Madhav Institute of Technology &amp; Science, Gwalior
            </h3>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
              Computer Science and Business Systems (CSBS)
            </p>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">Second year</p>
          </div>
        </article>

        <article className="portal-card space-y-5 border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900 sm:p-8">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-violet-100 text-violet-700 dark:bg-violet-950 dark:text-violet-300">
              <Users className="h-6 w-6" />
            </div>
            <h2 className="text-xl font-black text-slate-900 dark:text-white">Project Mentor</h2>
          </div>
          <div className="rounded-2xl bg-slate-50 p-5 dark:bg-slate-800/60">
            <h3 className="font-bold text-slate-900 dark:text-white">Dr. Saumil Maheshwari</h3>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">Assistant Professor</p>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">Department of CST</p>
          </div>
          <p className="text-sm leading-6 text-slate-600 dark:text-slate-400">
            With thanks for the guidance and support provided to the LabNEXUS project.
          </p>
        </article>
      </section>

      <footer className="flex flex-wrap items-center justify-center gap-2 border-t border-slate-200 pt-6 text-center text-xs font-medium text-slate-500 dark:border-slate-800 dark:text-slate-400">
        <span>LabNEXUS</span>
        <span aria-hidden="true">·</span>
        <span>Made with</span>
        <Heart className="h-3.5 w-3.5 fill-rose-500 text-rose-500" />
        <span>by the CSBS development team</span>
      </footer>
    </main>
  );
};
