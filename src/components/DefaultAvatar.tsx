/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

interface DefaultAvatarProps {
  className?: string;
}

export default function DefaultAvatar({ className = 'h-9 w-9' }: DefaultAvatarProps) {
  return (
    <svg
      className={`${className} shrink-0 rounded-full bg-neutral-800 text-neutral-500`}
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden
    >
      <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
    </svg>
  );
}
