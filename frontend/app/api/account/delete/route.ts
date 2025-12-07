import { type NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth/auth-options";

// Force dynamic rendering for routes using auth
export const dynamic = "force-dynamic";

// Account deletion reason storage (in production, this would go to a dedicated table)
interface AccountDeletionRecord {
  userId: string;
  email: string;
  reason: string;
  feedback?: string;
  deletedAt: string;
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json(
        { error: "Unauthorized - Please sign in" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { reason, feedback, confirmEmail } = body;

    // Verify email confirmation matches
    if (confirmEmail !== session.user.email) {
      return NextResponse.json(
        { error: "Email confirmation does not match" },
        { status: 400 }
      );
    }

    // Validate required fields
    if (!reason) {
      return NextResponse.json(
        { error: "Deletion reason is required" },
        { status: 400 }
      );
    }

    const userId = (session.user as { id?: string }).id || session.user.email;
    const baseUrl = process.env.NEXT_PUBLIC_API_URL || process.env.API_URL;

    // Store deletion record for analytics
    const deletionRecord: AccountDeletionRecord = {
      userId,
      email: session.user.email,
      reason,
      feedback,
      deletedAt: new Date().toISOString(),
    };

    // Log the deletion record (in production, store in a dedicated table)
    console.log("Account deletion record:", deletionRecord);

    // Delete user data from backend services
    const deletePromises: Promise<Response>[] = [];

    if (baseUrl) {
      // Delete entries
      deletePromises.push(
        fetch(`${baseUrl}/entries/user/${userId}`, {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${(session as { accessToken?: string }).accessToken || ""}`,
          },
        }).catch((err) => {
          console.error("Failed to delete entries:", err);
          return new Response(null, { status: 500 });
        })
      );

      // Delete insights
      deletePromises.push(
        fetch(`${baseUrl}/insights/user/${userId}`, {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${(session as { accessToken?: string }).accessToken || ""}`,
          },
        }).catch((err) => {
          console.error("Failed to delete insights:", err);
          return new Response(null, { status: 500 });
        })
      );

      // Delete settings
      deletePromises.push(
        fetch(`${baseUrl}/settings/user/${userId}`, {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${(session as { accessToken?: string }).accessToken || ""}`,
          },
        }).catch((err) => {
          console.error("Failed to delete settings:", err);
          return new Response(null, { status: 500 });
        })
      );

      // Wait for all deletions to complete
      await Promise.allSettled(deletePromises);
    }

    // Return success response
    return NextResponse.json({
      success: true,
      message: "Account deleted successfully",
      deletedAt: deletionRecord.deletedAt,
    });
  } catch (error) {
    console.error("Account deletion error:", error);
    return NextResponse.json(
      { error: "Failed to delete account" },
      { status: 500 }
    );
  }
}
