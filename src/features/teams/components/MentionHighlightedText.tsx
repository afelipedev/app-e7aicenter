import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

function buildMentionTokens(content: string, mentionNames: string[]): string[] {
  const fromNames = Array.from(
    new Set(
      mentionNames
        .map((name) => name.trim())
        .filter(Boolean)
        .map((name) => `@${name}`),
    ),
  );

  const inferred = Array.from(new Set(content.match(/@[\p{L}\p{N}._-]+/gu) || []));

  return Array.from(new Set([...fromNames, ...inferred])).sort((left, right) => right.length - left.length);
}

interface MentionHighlightedTextProps {
  content: string;
  /** Nomes dos usuários mencionados (sem @). */
  mentionNames?: string[];
  className?: string;
  mutedNonMentions?: boolean;
}

export function MentionHighlightedText({
  content,
  mentionNames = [],
  className,
  mutedNonMentions = false,
}: MentionHighlightedTextProps) {
  const mentions = buildMentionTokens(content, mentionNames);

  if (!mentions.length) {
    return (
      <span className={cn(mutedNonMentions && "text-muted-foreground", className)}>
        {content}
      </span>
    );
  }

  const parts: ReactNode[] = [];
  let cursor = 0;
  let key = 0;
  const lowerContent = content.toLowerCase();
  const lowerMentions = mentions.map((mention) => mention.toLowerCase());
  const plainClass = cn(mutedNonMentions && "text-muted-foreground", className);

  while (cursor < content.length) {
    let nextIndex = -1;
    let nextMentionIndex = -1;

    for (let i = 0; i < lowerMentions.length; i += 1) {
      const currentIndex = lowerContent.indexOf(lowerMentions[i], cursor);
      if (currentIndex === -1) continue;
      if (nextIndex === -1 || currentIndex < nextIndex) {
        nextIndex = currentIndex;
        nextMentionIndex = i;
      }
    }

    if (nextIndex === -1 || nextMentionIndex === -1) {
      parts.push(
        <span key={`text-${key++}`} className={plainClass}>
          {content.slice(cursor)}
        </span>,
      );
      break;
    }

    if (nextIndex > cursor) {
      parts.push(
        <span key={`text-${key++}`} className={plainClass}>
          {content.slice(cursor, nextIndex)}
        </span>,
      );
    }

    const matchedMention = content.slice(nextIndex, nextIndex + mentions[nextMentionIndex].length);
    parts.push(
      <span key={`mention-${key++}`} className="font-medium text-blue-600 dark:text-blue-400">
        {matchedMention}
      </span>,
    );

    cursor = nextIndex + mentions[nextMentionIndex].length;
  }

  return <>{parts}</>;
}
