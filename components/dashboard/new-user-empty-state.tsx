"use client";

import Link from "next/link";
import { Users, Calendar, PlusCircle } from "lucide-react";

export function NewUserEmptyState() {
  return (
    <div className="max-w-3xl mx-auto py-12 px-4">
      <div className="text-center mb-10">
        <h1 className="text-3xl font-bold text-foreground mb-2">
          Welcome to Hive Community!
        </h1>
        <p className="text-foreground-muted text-lg">
          Get started by joining a community or creating your own.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Link
          href="/communities"
          className="group flex flex-col items-center gap-3 p-6 bg-card border border-border rounded-xl hover:border-primary-500 hover:bg-background-hover transition-colors text-center"
        >
          <div className="w-12 h-12 rounded-xl bg-primary-subtle flex items-center justify-center group-hover:bg-primary-subtle-hover transition-colors">
            <Users className="h-6 w-6 text-primary-600" />
          </div>
          <div>
            <p className="font-semibold text-foreground">Browse Communities</p>
            <p className="text-sm text-foreground-muted mt-1">
              Find and join communities that match your interests
            </p>
          </div>
        </Link>

        <Link
          href="/events"
          className="group flex flex-col items-center gap-3 p-6 bg-card border border-border rounded-xl hover:border-primary-500 hover:bg-background-hover transition-colors text-center"
        >
          <div className="w-12 h-12 rounded-xl bg-primary-subtle flex items-center justify-center group-hover:bg-primary-subtle-hover transition-colors">
            <Calendar className="h-6 w-6 text-primary-600" />
          </div>
          <div>
            <p className="font-semibold text-foreground">Browse Events</p>
            <p className="text-sm text-foreground-muted mt-1">
              Discover upcoming events happening in your area
            </p>
          </div>
        </Link>

        <Link
          href="/communities/new"
          className="group flex flex-col items-center gap-3 p-6 bg-card border border-border rounded-xl hover:border-primary-500 hover:bg-background-hover transition-colors text-center"
        >
          <div className="w-12 h-12 rounded-xl bg-primary-subtle flex items-center justify-center group-hover:bg-primary-subtle-hover transition-colors">
            <PlusCircle className="h-6 w-6 text-primary-600" />
          </div>
          <div>
            <p className="font-semibold text-foreground">Create a Community</p>
            <p className="text-sm text-foreground-muted mt-1">
              Start your own community and bring people together
            </p>
          </div>
        </Link>
      </div>
    </div>
  );
}
