import { Feather } from "lucide-react";

export interface BookCoverProps {
  title: string;
  author: string;
}

export function BookCover({ title, author }: BookCoverProps) {
  return (
    <div className="romanziere-front-cover" aria-hidden="true">
      <div className="romanziere-cover-face romanziere-cover-outside">
        <span className="romanziere-cover-rule" />
        <Feather className="romanziere-cover-feather" />
        <p>{title}</p>
        <span className="romanziere-cover-ornament">✦</span>
        <small>{author}</small>
        <span className="romanziere-cover-rule romanziere-cover-rule-bottom" />
      </div>
      <div className="romanziere-cover-face romanziere-cover-inside">
        <span className="romanziere-endpaper-pattern" />
      </div>
    </div>
  );
}
