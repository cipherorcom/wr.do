// components/GitHubStarsWrapper.tsx
import { Suspense } from "react";

import { Skeleton } from "../ui/skeleton";
import { ErrorBoundary } from "./error-boundary";
import GitHubStarsButton from "./github-star-button";

interface GitHubResponse {
  stargazers_count: number;
}

async function getGitHubStars(owner: string, repo: string) {
  try {
    // 使用公共API，不需要token
    const res = await fetch(`https://api.github.com/repos/${owner}/${repo}`, {
      headers: {
        Accept: "application/vnd.github.v3+json",
        "User-Agent": "NextJS-App",
      },
      next: { revalidate: 3600 },
    });

    if (!res.ok) {
      throw new Error("Failed to fetch GitHub stars");
    }

    const data: GitHubResponse = await res.json();
    return data.stargazers_count;
  } catch (error) {
    console.error("Error fetching GitHub stars:", error);
    // 如果API调用失败，返回默认值
    return 0;
  }
}

interface Props {
  owner: string;
  repo: string;
  className?: string;
}

async function GitHubStarsWrapper({ owner, repo, className }: Props) {
  const stars = await getGitHubStars(owner, repo);

  return (
    <GitHubStarsButton
      owner={owner}
      repo={repo}
      className={className}
      initialStars={stars}
    />
  );
}

// 导出一个包装了 Suspense 的组件
export default function GitHubStarsWithSuspense(props: Props) {
  return (
    <ErrorBoundary fallback={<Skeleton className="h-4 w-12 rounded-lg" />}>
      <Suspense fallback={<Skeleton className="h-4 w-12 rounded-lg" />}>
        <GitHubStarsWrapper {...props} />
      </Suspense>
    </ErrorBoundary>
  );
}
