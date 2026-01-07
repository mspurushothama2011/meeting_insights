import React from 'react'
import toast from 'react-hot-toast'
import { Button, Card, CardHeader, CardBody, Badge, Spinner, Skeleton, SkeletonCard } from './ui'
import ThemeToggle from './ThemeToggle'
import { useTheme } from '../contexts/ThemeContext'

const TestPage = () => {
  const { theme } = useTheme()
  
  return (
    <div className="min-h-screen p-8">
      <div className="max-w-6xl mx-auto space-y-8">
        
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">
              Component Test Page
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              Testing Tailwind CSS, Dark Mode, and UI Components
            </p>
          </div>
          <ThemeToggle />
        </div>

        {/* Theme Info */}
        <Card>
          <CardHeader>
            <h2 className="text-xl font-semibold">Current Theme: {theme}</h2>
          </CardHeader>
          <CardBody>
            <p>Toggle the theme using the button in the top right corner.</p>
          </CardBody>
        </Card>

        {/* Buttons */}
        <Card>
          <CardHeader>
            <h2 className="text-xl font-semibold">Buttons</h2>
          </CardHeader>
          <CardBody>
            <div className="flex flex-wrap gap-4">
              <Button variant="primary" onClick={() => toast.success('Primary button clicked!')}>
                Primary
              </Button>
              <Button variant="secondary" onClick={() => toast('Secondary button!')}>
                Secondary
              </Button>
              <Button variant="success" onClick={() => toast.success('Success!')}>
                Success
              </Button>
              <Button variant="warning" onClick={() => toast('Warning!', { icon: '⚠️' })}>
                Warning
              </Button>
              <Button variant="danger" onClick={() => toast.error('Danger!')}>
                Danger
              </Button>
              <Button variant="outline">Outline</Button>
              <Button variant="ghost">Ghost</Button>
              <Button loading>Loading...</Button>
              <Button disabled>Disabled</Button>
            </div>
            
            <div className="mt-4 flex gap-4">
              <Button size="sm">Small</Button>
              <Button size="md">Medium</Button>
              <Button size="lg">Large</Button>
            </div>
          </CardBody>
        </Card>

        {/* Badges */}
        <Card>
          <CardHeader>
            <h2 className="text-xl font-semibold">Badges</h2>
          </CardHeader>
          <CardBody>
            <div className="flex flex-wrap gap-3">
              <Badge variant="primary">Primary</Badge>
              <Badge variant="secondary">Secondary</Badge>
              <Badge variant="success">Success</Badge>
              <Badge variant="warning">Warning</Badge>
              <Badge variant="danger">Danger</Badge>
              <Badge variant="gray">Gray</Badge>
            </div>
            
            <div className="mt-4 flex gap-3">
              <Badge size="sm">Small</Badge>
              <Badge size="md">Medium</Badge>
              <Badge size="lg">Large</Badge>
            </div>
          </CardBody>
        </Card>

        {/* Spinners */}
        <Card>
          <CardHeader>
            <h2 className="text-xl font-semibold">Spinners</h2>
          </CardHeader>
          <CardBody>
            <div className="flex gap-6 items-center">
              <div className="text-center">
                <Spinner size="sm" />
                <p className="text-sm mt-2">Small</p>
              </div>
              <div className="text-center">
                <Spinner size="md" />
                <p className="text-sm mt-2">Medium</p>
              </div>
              <div className="text-center">
                <Spinner size="lg" />
                <p className="text-sm mt-2">Large</p>
              </div>
              <div className="text-center">
                <Spinner size="xl" />
                <p className="text-sm mt-2">X-Large</p>
              </div>
            </div>
          </CardBody>
        </Card>

        {/* Skeletons */}
        <Card>
          <CardHeader>
            <h2 className="text-xl font-semibold">Skeleton Loaders</h2>
          </CardHeader>
          <CardBody className="space-y-4">
            <div>
              <h3 className="font-medium mb-2">Line Skeletons:</h3>
              <Skeleton height="1rem" width="100%" className="mb-2" />
              <Skeleton height="1rem" width="80%" className="mb-2" />
              <Skeleton height="1rem" width="60%" />
            </div>
            
            <div>
              <h3 className="font-medium mb-2">Circle Skeleton:</h3>
              <Skeleton circle width="4rem" height="4rem" />
            </div>
            
            <div>
              <h3 className="font-medium mb-2">Skeleton Card:</h3>
              <SkeletonCard />
            </div>
          </CardBody>
        </Card>

        {/* Toast Examples */}
        <Card>
          <CardHeader>
            <h2 className="text-xl font-semibold">Toast Notifications</h2>
          </CardHeader>
          <CardBody>
            <div className="flex flex-wrap gap-4">
              <Button onClick={() => toast('Basic toast notification')}>
                Basic Toast
              </Button>
              <Button variant="success" onClick={() => toast.success('Success message!')}>
                Success Toast
              </Button>
              <Button variant="danger" onClick={() => toast.error('Error message!')}>
                Error Toast
              </Button>
              <Button onClick={() => toast('Loading...', { icon: '⏳', duration: 2000 })}>
                Custom Icon
              </Button>
              <Button onClick={() => toast.promise(
                new Promise((resolve) => setTimeout(resolve, 2000)),
                {
                  loading: 'Processing...',
                  success: 'Done!',
                  error: 'Failed!',
                }
              )}>
                Promise Toast
              </Button>
            </div>
          </CardBody>
        </Card>

      </div>
    </div>
  )
}

export default TestPage
