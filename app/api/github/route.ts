// app/api/github-stars/route.ts
import { NextRequest, NextResponse } from "next/server";

interface GitHubResponse {
  stargazers_count: number;
  message?: string;
}

export async function GET(request: NextRequest) {
  // 从 URL 中获取查询参数
  const searchParams = request.nextUrl.searchParams;
  const owner = searchParams.get("owner");
  const repo = searchParams.get("repo");

  // 验证必需的参数
  if (!owner || !repo) {
    return NextResponse.json(
      { error: "Invalid owner or repo parameters" },
      { status: 400 },
    );
  }

  try {
    // 使用公共API，不再需要token
    const response = await fetch(
      `https://api.github.com/repos/${owner}/${repo}`,
      {
        headers: {
          Accept: "application/vnd.github.v3+json",
          "User-Agent": "NextJS-App",
        },
        // 添加缓存策略
        next: {
          revalidate: 3600, // 1小时后重新验证
        },
      },
    );

    if (!response.ok) {
      const errorData: GitHubResponse = await response.json();
      throw new Error(
        errorData.message || `HTTP error! status: ${response.status}`,
      );
    }

    const data: GitHubResponse = await response.json();

    return NextResponse.json(
      { stars: data.stargazers_count },
      {
        headers: {
          "Cache-Control":
            "public, s-maxage=3600, stale-while-revalidate=86400",
        },
      },
    );
  } catch (error) {
    console.error("GitHub API error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to fetch GitHub stars",
        stars: 0, // 返回默认值
      },
      { status: 500 },
    );
  }
}
