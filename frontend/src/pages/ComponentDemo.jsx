import React, { useState } from 'react'
import Layout from '../components/Layout'
import { 
  Button, 
  Card, 
  CardHeader, 
  CardBody, 
  Badge, 
  Toast, 
  EmptyState, 
  LoadingSpinner, 
  Modal 
} from '../components/ui'

const ComponentDemo = () => {
  const [showToast, setShowToast] = useState(false)
  const [toastVariant, setToastVariant] = useState('info')
  const [showModal, setShowModal] = useState(false)
  const [loading, setLoading] = useState(false)
  
  const handleShowToast = (variant) => {
    setToastVariant(variant)
    setShowToast(true)
  }
  
  const handleShowLoading = () => {
    setLoading(true)
    setTimeout(() => {
      setLoading(false)
    }, 2000)
  }
  
  return (
    <Layout>
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Component Demo</h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            Showcase of UI components with enhanced accessibility and user experience
          </p>
        </div>
        
        {/* Buttons Section */}
        <Card>
          <CardHeader>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Buttons</h2>
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
              <Button loading>Loading</Button>
            </div>
          </CardBody>
        </Card>
        
        {/* Badges Section */}
        <Card>
          <CardHeader>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Badges</h2>
          </CardHeader>
          <CardBody>
            <div className="flex flex-wrap gap-4">
              <Badge variant="primary">Primary</Badge>
              <Badge variant="secondary">Secondary</Badge>
              <Badge variant="success">Success</Badge>
              <Badge variant="warning">Warning</Badge>
              <Badge variant="danger">Danger</Badge>
              <Badge variant="gray">Gray</Badge>
            </div>
          </CardBody>
        </Card>
        
        {/* Toasts Section */}
        <Card>
          <CardHeader>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Toasts</h2>
          </CardHeader>
          <CardBody>
            <div className="space-y-4">
              <div className="flex flex-wrap gap-4">
                <Button onClick={() => handleShowToast('info')}>Show Info Toast</Button>
                <Button onClick={() => handleShowToast('success')}>Show Success Toast</Button>
                <Button onClick={() => handleShowToast('warning')}>Show Warning Toast</Button>
                <Button onClick={() => handleShowToast('error')}>Show Error Toast</Button>
              </div>
              
              {showToast && (
                <Toast 
                  variant={toastVariant}
                  onClose={() => setShowToast(false)}
                  autoDismiss={true}
                  dismissTime={3000}
                >
                  This is a {toastVariant} toast notification!
                </Toast>
              )}
            </div>
          </CardBody>
        </Card>
        
        {/* Empty States Section */}
        <Card>
          <CardHeader>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Empty States</h2>
          </CardHeader>
          <CardBody>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <EmptyState
                title="No Meetings Found"
                description="Get started by uploading your first meeting recording."
                icon="meetings"
                action={true}
                actionText="Upload Meeting"
                onAction={() => alert('Upload action triggered')}
              />
              
              <EmptyState
                title="No Search Results"
                description="Try adjusting your search criteria to find what you're looking for."
                icon="search"
              />
            </div>
          </CardBody>
        </Card>
        
        {/* Loading Section */}
        <Card>
          <CardHeader>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Loading States</h2>
          </CardHeader>
          <CardBody>
            <div className="space-y-4">
              <Button onClick={handleShowLoading} disabled={loading}>
                {loading ? 'Loading...' : 'Show Loading Spinner'}
              </Button>
              
              {loading && (
                <div className="flex justify-center my-4">
                  <LoadingSpinner size="lg" message="Processing your request..." />
                </div>
              )}
            </div>
          </CardBody>
        </Card>
        
        {/* Modals Section */}
        <Card>
          <CardHeader>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Modals</h2>
          </CardHeader>
          <CardBody>
            <div className="space-y-4">
              <Button onClick={() => setShowModal(true)}>
                Open Modal
              </Button>
              
              <Modal
                isOpen={showModal}
                onClose={() => setShowModal(false)}
                title="Sample Modal"
                size="md"
                actions={
                  <>
                    <Button variant="primary" onClick={() => setShowModal(false)}>
                      Confirm
                    </Button>
                    <Button variant="ghost" onClick={() => setShowModal(false)} className="ml-3">
                      Cancel
                    </Button>
                  </>
                }
              >
                <p className="text-gray-600 dark:text-gray-300">
                  This is a sample modal demonstrating the new Modal component with enhanced accessibility features.
                </p>
                <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <h4 className="font-medium text-gray-900 dark:text-white">Features:</h4>
                  <ul className="mt-2 list-disc list-inside text-gray-600 dark:text-gray-300">
                    <li>Keyboard navigation support</li>
                    <li>Proper focus management</li>
                    <li>ARIA attributes for screen readers</li>
                    <li>Escape key to close</li>
                    <li>Click outside to close</li>
                  </ul>
                </div>
              </Modal>
            </div>
          </CardBody>
        </Card>
      </div>
    </Layout>
  )
}

export default ComponentDemo