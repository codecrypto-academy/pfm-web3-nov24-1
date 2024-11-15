export default function ProductLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return (
        <div className="min-h-screen bg-gradient-to-b from-oil-light to-oil-dark">
            {children}
        </div>
    )
}
