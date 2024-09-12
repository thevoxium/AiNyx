// Anshul_6273
 
// Anshul_6273
#include<bits/stdc++.h>
using namespace std;
 
 
#define int long long
 
#define fr(a, b, c) for(int i=a; i<b; i+=c)
 
 
void solve();
bool isprime( int n ) {
    if ( n == 1 ) return false; if ( n == 2 ) return true;
    for ( int i = 2; i * i <= n; ++i )
        if ( n%i == 0 ) return false;
    return true;
}
 
void setIO(string name = "") {
  if ((int)name.size()) {
    freopen((name + ".in").c_str(), "r", stdin);
    freopen((name + ".out").c_str(), "w", stdout);
  }
}
 
void setmyIO(){
  #ifndef ONLINE_JUDGE
   freopen("input.txt", "r", stdin);
   freopen("error.txt", "w", stderr);
   freopen("output.txt", "w", stdout);
   #endif
}
 
signed main(){
   ios_base::sync_with_stdio(false);cin.tie(NULL);
  
   
   setmyIO();
   //setIO();
 
    int t=1;
   //cin>>t;
   while(t--){
      solve();
   }
  
   //cerr<<"time taken : "<<(float)clock()/CLOCKS_PER_SEC<<" secs"<<endl;
   return 0;
}

void solve() {
    string s;
    cin>>s;
    stack<char> st;
    for (int i=0; i<s.size(); i++){
        //cout<<s[i]<<endl;
        bool flag = true;
        while(!st.empty() && st.top() == s[i]){
            st.pop();
            flag = false;
        }
        if(flag) st.push(s[i]);
    }
    //cout<<st.size()<<endl;
    string ans = "";
    while(!st.empty()){
        char x = st.top();
        ans.push_back(x);
        st.pop();
    }
    reverse(ans.begin(), ans.end());
    cout<<ans<<endl;
}












