import type { FC, ReactNode } from "react";

interface Props {
  header: ReactNode;
  children: ReactNode;
}

const WelcomeForgePanel: FC<Props> = ({
  header,
  children,
}) => {
  
  return (
    <div className="rounded-2xl border border-violet-400/20 bg-violet-500/10 p-4">
      {header}
      {children}
    </div>
  );

};

export default WelcomeForgePanel;
