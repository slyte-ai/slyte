/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import DefaultAvatar from './DefaultAvatar';

interface AvatarProps {
  url: string | null | undefined;
  alt: string;
  className?: string;
}

export default function Avatar({ url, alt, className = 'h-9 w-9' }: AvatarProps) {
  if (url) {
    return (
      <img
        src={url}
        alt={alt}
        className={`${className} rounded-full object-cover bg-neutral-900`}
      />
    );
  }
  return <DefaultAvatar className={className} />;
}
