import type { User } from "@supabase/supabase-js";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { GoogleLogoMark } from "@/components/GoogleLogoMark";
import { getAuthProfile } from "@/lib/auth-profile";
import { t } from "@/lib/i18n";

type Props = {
  user: User;
  size?: "sm" | "md";
  showProvider?: boolean;
};

export function AccountIdentityBlock({ user, size = "sm", showProvider = true }: Props) {
  const profile = getAuthProfile(user);
  if (!profile) return null;

  const avatarClass = size === "md" ? "h-10 w-10" : "h-8 w-8";
  const nameClass = size === "md" ? "text-sm" : "text-xs";

  return (
    <div className="flex min-w-0 items-center gap-2.5">
      <Avatar className={avatarClass}>
        {profile.avatarUrl && (
          <AvatarImage src={profile.avatarUrl} alt={profile.displayName} referrerPolicy="no-referrer" />
        )}
        <AvatarFallback className="bg-primary/15 text-[10px] font-semibold text-primary">
          {profile.initials}
        </AvatarFallback>
      </Avatar>
      <div className="min-w-0 flex-1">
        <p className={`truncate font-medium text-foreground ${nameClass}`}>{profile.displayName}</p>
        {profile.email && (
          <p className="truncate text-[10px] text-muted-foreground">{profile.email}</p>
        )}
        {showProvider && profile.isGoogle && (
          <p className="mt-0.5 inline-flex items-center gap-1 text-[10px] font-medium text-muted-foreground">
            <GoogleLogoMark className="h-3 w-3" />
            {t("signed_in_with_google")}
          </p>
        )}
      </div>
    </div>
  );
}
