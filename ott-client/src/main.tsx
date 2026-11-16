import { StrictMode } from 'react'
import ReactDOM from 'react-dom/client'
import { Provider } from 'react-redux'
import { RouterProvider } from 'react-router'
import { store } from './app/store'
import { DirectionProvider } from './context/direction-provider'
import { FontProvider } from './context/font-provider'
import { MotionProvider } from './context/motion-provider'
import { ThemeProvider } from './context/theme-provider'
import { router } from './routes/router'
import './styles/index.css'

const rootElement = document.getElementById('root')!
if (!rootElement.innerHTML) {
  ReactDOM.createRoot(rootElement).render(
    <StrictMode>
      <Provider store={store}>
        <ThemeProvider>
          <FontProvider>
            <DirectionProvider>
              <MotionProvider>
                <RouterProvider router={router} />
              </MotionProvider>
            </DirectionProvider>
          </FontProvider>
        </ThemeProvider>
      </Provider>
    </StrictMode>
  )
}
