import React, { useState } from 'react'
import { 
  Button, 
  Card, 
  CardHeader, 
  CardBody, 
  Badge, 
  Toast, 
  EmptyState, 
  LoadingSpinner, 
  Modal, 
  FloatingLabelInput, 
  ToggleSwitch, 
  ProgressBar 
} from '../components/ui'

const ComponentShowcase = () => {
  const [showToast, setShowToast] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isToggled, setIsToggled] = useState(false)
  const [progress, setProgress] = useState(30)
  const [loading, setLoading] = useState(false)

  const showToastMessage = () => {
    setShowToast(true)
    setTimeout(() => setShowToast(false), 3000)
  }

  const simulateProgress = () => {
    setProgress(0)
    const interval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval)
          return 100
        }
        return prev + 10
      })
    }, 500)
  }

  const simulateLoading = () => {
    setLoading(true)
    setTimeout(() => setLoading(false), 2000)
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Component Showcase
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-400">
            Demonstrating enhanced UI components
          </p>
        </div>

        {/* Toast Demo */}
        <Card className="mb-8">
          <CardHeader>
            <h2 className="text-xl font-semibold">Toast Notifications</h2>
          </CardHeader>
          <CardBody>
            <div className="flex flex-wrap gap-4">
              <Button onClick={showToastMessage}>
                Show Toast
              </Button>
            </div>
          </CardBody>
        </Card>

        {showToast && (
          <div className="fixed top-4 right-4 z-50">
            <Toast 
              variant="success" 
              onClose={() => setShowToast(false)}
            >
              This is a toast notification!
            </Toast>
          </div>
        )}

        {/* Form Components Demo */}
        <Card className="mb-8">
          <CardHeader>
            <h2 className="text-xl font-semibold">Form Components</h2>
          </CardHeader>
          <CardBody>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FloatingLabelInput
                label="Email Address"
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email"
                required
              />
              <FloatingLabelInput
                label="Password"
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                required
              />
            </div>
            <div className="mt-6 flex items-center">
              <ToggleSwitch
                checked={isToggled}
                onChange={(e) => setIsToggled(e.target.checked)}
                label="Remember me"
              />
            </div>
          </CardBody>
        </Card>

        {/* Progress Demo */}
        <Card className="mb-8">
          <CardHeader>
            <h2 className="text-xl font-semibold">Progress Indicators</h2>
          </CardHeader>
          <CardBody>
            <div className="space-y-6">
              <div>
                <div className="flex justify-between mb-2">
                  <span className="text-sm font-medium">Loading Progress</span>
                  <span className="text-sm font-medium">{progress}%</span>
                </div>
                <ProgressBar value={progress} showPercentage />
              </div>
              <div className="flex flex-wrap gap-4">
                <Button onClick={simulateProgress}>
                  Simulate Progress
                </Button>
                <Button onClick={simulateLoading} loading={loading}>
                  {loading ? 'Loading...' : 'Simulate Loading'}
                </Button>
              </div>
              {loading && (
                <div className="mt-4">
                  <LoadingSpinner />
                </div>
              )}
            </div>
          </CardBody>
        </Card>

        {/* Button Variants Demo */}
        <Card className="mb-8">
          <CardHeader>
            <h2 className="text-xl font-semibold">Button Variants</h2>
          </CardHeader>
          <CardBody>
            <div className="flex flex-wrap gap-4">
              <Button variant="primary">Primary</Button>
              <Button variant="secondary">Secondary</Button>
              <Button variant="success">Success</Button>
              <Button variant="warning">Warning</Button>
              <Button variant="danger">Danger</Button>
              <Button variant="outline">Outline</Button>
              <Button variant="ghost">Ghost</Button>
            </div>
            <div className="mt-4 flex flex-wrap gap-4">
              <Button size="xs">Extra Small</Button>
              <Button size="sm">Small</Button>
              <Button size="md">Medium</Button>
              <Button size="lg">Large</Button>
              <Button size="xl">Extra Large</Button>
            </div>
            <div className="mt-4 flex flex-wrap gap-4">
              <Button loading>Primary Loading</Button>
              <Button variant="secondary" loading>Secondary Loading</Button>
              <Button disabled>Disabled Button</Button>
            </div>
          </CardBody>
        </Card>

        {/* Modal Demo */}
        <Card className="mb-8">
          <CardHeader>
            <h2 className="text-xl font-semibold">Modal Dialogs</h2>
          </CardHeader>
          <CardBody>
            <Button onClick={() => setShowModal(true)}>
              Open Modal
            </Button>
          </CardBody>
        </Card>

        <Modal
          isOpen={showModal}
          onClose={() => setShowModal(false)}
          title="Sample Modal"
          size="md"
          actions={
            <>
              <Button variant="secondary" onClick={() => setShowModal(false)}>
                Cancel
              </Button>
              <Button className="ml-2">
                Confirm
              </Button>
            </>
          }
        >
          <p className="text-gray-600 dark:text-gray-300">
            This is a sample modal dialog showcasing the enhanced modal component.
            It includes improved focus management, better animations, and enhanced accessibility.
          </p>
        </Modal>

        {/* Empty State Demo */}
        <Card>
          <CardHeader>
            <h2 className="text-xl font-semibold">Empty States</h2>
          </CardHeader>
          <CardBody>
            <EmptyState
              title="No Items Found"
              description="There are no items to display in this section."
              icon={
                <svg className="w-16 h-16 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                </svg>
              }
            />
          </CardBody>
        </Card>
      </div>
    </div>
  )
}

export default ComponentShowcase