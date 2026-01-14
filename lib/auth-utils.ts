export function isRoastMode(user: any) {
  if (!user) return false;
  return user.toneMode === "roast";
}




