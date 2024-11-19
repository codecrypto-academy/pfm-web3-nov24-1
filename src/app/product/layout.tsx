export default function ProductLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return (
        <div className="min-h-screen bg-gradient-to-b from-oil-50 to-oil-400/30">
            {children}
        </div>
    )
}
