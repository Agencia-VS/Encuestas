export const BRAND_TOKENS = {
  primary: "#382960",
  secondary: "#A42879",
  neutralDark: "#252626",
  neutralLight: "#F6F3FB",
  gold: "#EBBC45",
  red: "#AE1F1D",
  coral: "#C73D35",
} as const;

const DEFAULT_LOGO_PATH = "https://res.cloudinary.com/dubnevl0h/image/upload/v1768136919/Dise%C3%B1o_sin_t%C3%ADtulo_q9tq1a.png";
const DEFAULT_CLOUDINARY_TRANSFORM = "f_auto,q_auto,w_900";
const DEFAULT_CLOUDINARY_FAREWELL_TRANSFORM = "f_auto,q_auto,w_320";

function clean(value: string | undefined): string {
  return value?.trim() ?? "";
}

function resolveLogoUrl(publicLogoUrl: string, cloudinaryTransform: string, fallbackUrl: string): string {
  if (!publicLogoUrl) {
    return fallbackUrl;
  }

  // If the URL is already a Cloudinary asset, use it as-is.
  if (publicLogoUrl.includes("res.cloudinary.com")) {
    return publicLogoUrl;
  }

  const cloudinaryCloudName = clean(process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME);
  if (!cloudinaryCloudName) {
    return fallbackUrl;
  }

  // Use Cloudinary fetch to optimize any public logo URL.
  const encodedPublicUrl = encodeURIComponent(publicLogoUrl);
  return `https://res.cloudinary.com/${cloudinaryCloudName}/image/fetch/${cloudinaryTransform}/${encodedPublicUrl}`;
}

export function getAgencyLogoUrl(): string {
  const publicLogoUrl = clean(process.env.NEXT_PUBLIC_AGENCY_LOGO_PUBLIC_URL);
  const cloudinaryTransform = clean(process.env.NEXT_PUBLIC_CLOUDINARY_LOGO_TRANSFORM) || DEFAULT_CLOUDINARY_TRANSFORM;

  return resolveLogoUrl(publicLogoUrl, cloudinaryTransform, DEFAULT_LOGO_PATH);
}

export function getAgencyFarewellLogoUrl(): string {
  const publicLogoUrl = clean(process.env.NEXT_PUBLIC_AGENCY_LOGO_FAREWELL_PUBLIC_URL);
  const cloudinaryTransform =
    clean(process.env.NEXT_PUBLIC_CLOUDINARY_LOGO_FAREWELL_TRANSFORM) || DEFAULT_CLOUDINARY_FAREWELL_TRANSFORM;

  return resolveLogoUrl(publicLogoUrl, cloudinaryTransform, getAgencyLogoUrl());
}
