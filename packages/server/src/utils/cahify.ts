export default function cachify(ttl: number) {
  return (res: Response) => {
    res.headers.set(
      'Cache-Control',
      `public, max-age=${ttl}, s-maxage=${ttl}, stale-while-revalidate=${ttl * 2}`,
    )
    return res
  }
}
