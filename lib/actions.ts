"use server";

import { auth } from "@/auth";
import { parseServerActionResponse } from "@/lib/utils";
import slugify from "slugify";
import { writeClient } from "@/sanity/lib/write-client";

export const createPitch = async (
  state: unknown,
  form: FormData,
  pitch: string,
) => {
  const session = await auth();

  if (!session)
    return parseServerActionResponse({
      error: "Not signed in",
      status: "ERROR",
    });

  const { title, description, category, link } = Object.fromEntries(
    Array.from(form).filter(([key]) => key !== "pitch"),
  );

  const slug = slugify(title as string, { lower: true, strict: true });

  if (!session?.id) {
    console.error("Session ID is missing:", session);
    return parseServerActionResponse({
      error: "User ID not found in session. Please try logging out and back in.",
      status: "ERROR",
    });
  }

  try {
    const startup = {
      title,
      description,
      category,
      image: link,
      slug: {
        _type: "slug",
        current: slug,
      },
      author: {
        _type: "reference",
        _ref: session.id,
      },
      pitch,
    };

    console.log("Creating startup with:", { title, authorId: session.id });
    const result = await writeClient.create({ _type: "startup", ...startup });
    console.log("Startup created successfully:", result._id);

    return parseServerActionResponse({
      ...result,
      error: "",
      status: "SUCCESS",
    });
  } catch (error) {
    console.error("Error creating startup:", error);

    return parseServerActionResponse({
      error: error instanceof Error ? error.message : JSON.stringify(error),
      status: "ERROR",
    });
  }
};
