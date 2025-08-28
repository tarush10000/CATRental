import Link from 'next/link'

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-cat-light-gray to-white">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center">
              <div className="h-10 w-10 bg-cat-yellow rounded flex items-center justify-center">
                <svg className="h-6 w-6 text-cat-black" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M8 3.5a.5.5 0 0 0-1 0V9a.5.5 0 0 0 .252.434l3.5 2a.5.5 0 0 0 .496-.868L8 8.71V3.5z"/>
                  <path d="M8 16A8 8 0 1 0 8 0a8 8 0 0 0 0 16zm7-8A7 7 0 1 1 1 8a7 7 0 0 1 14 0z"/>
                </svg>
              </div>
              <h1 className="ml-3 text-xl font-bold text-cat-dark-gray">
                CatRental
              </h1>
            </div>
            
            <div className="space-x-4">
              <Link href="/auth/signin" className="btn-secondary">
                Sign In
              </Link>
              <Link href="/auth/signup" className="btn-primary">
                Get Started
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center">
          <div className="mb-8">
            <div className="mx-auto mb-6 h-24 w-24 bg-cat-yellow rounded-full flex items-center justify-center">
              <svg className="h-12 w-12 text-cat-black" fill="currentColor" viewBox="0 0 24 24">
                <path d="M3 6h18v2H3V6zm0 5h18v2H3v-2zm0 5h18v2H3v-2z"/>
              </svg>
            </div>
            <h1 className="text-4xl md:text-6xl font-bold text-cat-dark-gray mb-4">
              Caterpillar Equipment
              <span className="block text-cat-yellow">Rental Management</span>
            </h1>
            <p className="text-xl text-cat-medium-gray max-w-3xl mx-auto mb-8">
              Streamline your Caterpillar equipment rentals with real-time tracking, 
              intelligent scheduling, and powerful fleet management analytics.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-16">
            <Link href="/auth/signup" className="btn-primary text-lg px-8 py-4">
              Start Managing Equipment
            </Link>
            <Link href="/auth/signin" className="btn-secondary text-lg px-8 py-4">
              Sign In to Dashboard
            </Link>
          </div>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-16">
          {/* Admin Features */}
          <div className="card">
            <div className="card-body text-center">
              <div className="mx-auto mb-4 h-16 w-16 bg-cat-yellow rounded-full flex items-center justify-center">
                <svg className="h-8 w-8 text-cat-black" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-cat-dark-gray mb-3">
                Admin Control
              </h3>
              <p className="text-cat-medium-gray mb-4">
                Manage your entire fleet with barcode scanning, order processing, 
                and comprehensive analytics.
              </p>
              <ul className="text-sm text-cat-medium-gray space-y-2 text-left">
                <li>✓ Add machines with barcode scanning</li>
                <li>✓ Process customer requests</li>
                <li>✓ Real-time dashboard analytics</li>
                <li>✓ Order management system</li>
              </ul>
            </div>
          </div>

          {/* Customer Features */}
          <div className="card">
            <div className="card-body text-center">
              <div className="mx-auto mb-4 h-16 w-16 bg-cat-yellow rounded-full flex items-center justify-center">
                <svg className="h-8 w-8 text-cat-black" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-cat-dark-gray mb-3">
                Customer Portal
              </h3>
              <p className="text-cat-medium-gray mb-4">
                Track your machines, create requests, and get intelligent 
                recommendations for optimal usage.
              </p>
              <ul className="text-sm text-cat-medium-gray space-y-2 text-left">
                <li>✓ Track machine status</li>
                <li>✓ Request extensions & support</li>
                <li>✓ Smart usage recommendations</li>
                <li>✓ Order new equipment</li>
              </ul>
            </div>
          </div>

          {/* Technology Features */}
          <div className="card">
            <div className="card-body text-center">
              <div className="mx-auto mb-4 h-16 w-16 bg-cat-yellow rounded-full flex items-center justify-center">
                <svg className="h-8 w-8 text-cat-black" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M9 17H7v-7h2v7zm4 0h-2V7h2v10zm4 0h-2v-4h2v4zm2 2H5V5h14v14z"/>
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-cat-dark-gray mb-3">
                Smart Analytics
              </h3>
              <p className="text-cat-medium-gray mb-4">
                Leverage data-driven insights to optimize operations, 
                reduce costs, and improve efficiency.
              </p>
              <ul className="text-sm text-cat-medium-gray space-y-2 text-left">
                <li>✓ Real-time tracking</li>
                <li>✓ Usage analytics</li>
                <li>✓ Predictive maintenance</li>
                <li>✓ Cost optimization</li>
              </ul>
            </div>
          </div>
        </div>

        {/* How It Works */}
        <div className="text-center mb-16">
          <h2 className="text-3xl font-bold text-cat-dark-gray mb-12">
            How It Works
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div className="text-center">
              <div className="bg-cat-yellow rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold text-cat-black">1</span>
              </div>
              <h4 className="font-semibold text-cat-dark-gray mb-2">Sign Up</h4>
              <p className="text-sm text-cat-medium-gray">
                Create your account as admin or customer
              </p>
            </div>
            
            <div className="text-center">
              <div className="bg-cat-yellow rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold text-cat-black">2</span>
              </div>
              <h4 className="font-semibold text-cat-dark-gray mb-2">Add Machines</h4>
              <p className="text-sm text-cat-medium-gray">
                Scan barcodes or manually add equipment
              </p>
            </div>
            
            <div className="text-center">
              <div className="bg-cat-yellow rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold text-cat-black">3</span>
              </div>
              <h4 className="font-semibold text-cat-dark-gray mb-2">Track & Manage</h4>
              <p className="text-sm text-cat-medium-gray">
                Monitor status and process requests
              </p>
            </div>
            
            <div className="text-center">
              <div className="bg-cat-yellow rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold text-cat-black">4</span>
              </div>
              <h4 className="font-semibold text-cat-dark-gray mb-2">Optimize</h4>
              <p className="text-sm text-cat-medium-gray">
                Get insights and recommendations
              </p>
            </div>
          </div>
        </div>

        {/* Call to Action */}
        <div className="bg-cat-dark-gray rounded-lg p-8 text-center">
          <h2 className="text-2xl font-bold text-white mb-4">
            Ready to Transform Your Fleet Management?
          </h2>
          <p className="text-gray-300 mb-6 max-w-2xl mx-auto">
            Join hundreds of Caterpillar dealers and customers who are already 
            streamlining their operations with CatRental's intelligent tracking system.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/auth/signup" className="btn-primary">
              Start Free Trial
            </Link>
            <button className="btn-secondary bg-white text-cat-dark-gray border-white hover:bg-gray-100">
              Schedule Demo
            </button>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="flex items-center mb-4 md:mb-0">
              <div className="h-8 w-8 bg-cat-yellow rounded flex items-center justify-center mr-3">
                <svg className="h-5 w-5 text-cat-black" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M8 3.5a.5.5 0 0 0-1 0V9a.5.5 0 0 0 .252.434l3.5 2a.5.5 0 0 0 .496-.868L8 8.71V3.5z"/>
                </svg>
              </div>
              <span className="text-cat-dark-gray font-semibold">
                CatRental
              </span>
            </div>
            
            <div className="flex space-x-6 text-sm text-cat-medium-gray">
              <Link href="/about" className="hover:text-cat-dark-gray">
                About
              </Link>
              <Link href="/support" className="hover:text-cat-dark-gray">
                Support
              </Link>
              <Link href="/privacy" className="hover:text-cat-dark-gray">
                Privacy
              </Link>
              <Link href="/terms" className="hover:text-cat-dark-gray">
                Terms
              </Link>
            </div>
          </div>
          
          <div className="border-t border-gray-200 mt-6 pt-6 text-center">
            <p className="text-sm text-cat-medium-gray">
              © 2025 CatRental. Built for efficient Caterpillar equipment management.
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}