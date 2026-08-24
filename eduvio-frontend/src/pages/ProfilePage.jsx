import { useAuth } from '../context/AuthContext'
import Profile from '../components/Profile'

const ProfilePage = () => {
  const { user } = useAuth()

  return <Profile user={user} />
}

export default ProfilePage
